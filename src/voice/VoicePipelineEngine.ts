import { diagnostics } from './VoiceDiagnostics';

export interface VoicePipelineConfig {
  sampleRate: number;
  vadThreshold: number;
  wsUrl: string;
  onStateChange?: (state: string) => void;
  onAudioVolume?: (vol: number) => void;
}

export class VoicePipelineEngine {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private socket: WebSocket | null = null;

  private config: VoicePipelineConfig;
  private isRecording = false;
  private isAutoRecovering = false;
  private reconnectAttempts = 0;
  private audioQueue: AudioBuffer[] = [];
  private isPlayingAudio = false;

  constructor(config?: Partial<VoicePipelineConfig>) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;

    this.config = {
      sampleRate: 16000,
      vadThreshold: 0.04,
      wsUrl: `${protocol}//${host}/ws/live`,
      ...config,
    };
  }

  /**
   * Stage 1: Microphone Initialization
   */
  public async initMicrophone(): Promise<boolean> {
    try {
      diagnostics.logMicStatus('requesting');
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.config.sampleRate,
        },
      });

      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
        sampleRate: this.config.sampleRate,
      });

      diagnostics.logMicStatus('active');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      diagnostics.logMicStatus('blocked', `Microphone Access Denied: ${msg}`);
      return false;
    }
  }

  /**
   * Stage 6: Persistent WebSocket Connection
   */
  public connectLiveSession(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        diagnostics.update({ wsState: 'CONNECTING' });
        this.socket = new WebSocket(this.config.wsUrl);
        this.socket.binaryType = 'arraybuffer';

        this.socket.onopen = () => {
          diagnostics.update({ wsState: 'OPEN', reconnectCount: this.reconnectAttempts });
          this.reconnectAttempts = 0;
          resolve(true);
        };

        this.socket.onmessage = async (event) => {
          diagnostics.markFirstAudioReceived();
          if (typeof event.data === 'string') {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === 'state') {
                diagnostics.update({ currentState: msg.state });
                if (this.config.onStateChange) this.config.onStateChange(msg.state);
              }
            } catch {
              // Ignore non-json text
            }
          } else if (event.data instanceof ArrayBuffer) {
            await this.handleIncomingAudio(event.data);
          }
        };

        this.socket.onerror = () => {
          diagnostics.logError('WebSocket error encountered');
          this.handleDisconnectAndRecover();
        };

        this.socket.onclose = () => {
          diagnostics.update({ wsState: 'CLOSED' });
          this.handleDisconnectAndRecover();
        };
      } catch (err) {
        diagnostics.logError(`Connection error: ${err}`);
        resolve(false);
      }
    });
  }

  /**
   * Stage 2–5: Audio Capture, VAD, 16kHz PCM Encoding & Streaming
   */
  public async startStreaming(): Promise<void> {
    if (!this.mediaStream) {
      const ok = await this.initMicrophone();
      if (!ok) return;
    }
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      await this.connectLiveSession();
    }

    if (!this.audioContext || !this.mediaStream) return;

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    // 2048 samples at 16kHz ≈ 128ms per chunk
    this.scriptNode = this.audioContext.createScriptProcessor(2048, 1, 1);

    source.connect(this.scriptNode);
    this.scriptNode.connect(this.audioContext.destination);

    this.isRecording = true;
    let silenceSamples = 0;
    let wasSpeaking = false;

    this.scriptNode.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const inputBuffer = e.inputBuffer.getChannelData(0);

      // Stage 2: VAD RMS Energy Calculation
      let sum = 0;
      for (let i = 0; i < inputBuffer.length; i++) {
        sum += inputBuffer[i] * inputBuffer[i];
      }
      const rms = Math.sqrt(sum / inputBuffer.length);
      const isVoice = rms > this.config.vadThreshold;

      diagnostics.logVAD(isVoice, rms * 10);
      if (this.config.onAudioVolume) {
        this.config.onAudioVolume(rms * 10);
      }

      diagnostics.incrementFrames();

      // Track end of speech for latency calculation
      if (isVoice) {
        wasSpeaking = true;
        silenceSamples = 0;
      } else if (wasSpeaking) {
        silenceSamples += inputBuffer.length;
        // ~600ms of silence indicates end of speech
        if (silenceSamples > 9600) {
          diagnostics.markEndOfSpeech();
          wasSpeaking = false;
        }
      }

      // Stage 4: Int16 16kHz PCM Encoding
      const pcm16 = new Int16Array(inputBuffer.length);
      for (let i = 0; i < inputBuffer.length; i++) {
        const s = Math.max(-1, Math.min(1, inputBuffer[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // Stage 5: Audio Streaming over WebSocket
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(pcm16.buffer);
        diagnostics.addBytesTransmitted(pcm16.byteLength);
      }
    };
  }

  /**
   * Stage 9–10: Audio Decoding & Speaker Playback
   */
  private async handleIncomingAudio(arrayBuffer: ArrayBuffer) {
    if (!this.audioContext) return;
    try {
      diagnostics.update({ playbackStatus: 'buffering' });
      // Decode 16-bit 16kHz mono raw PCM or WAV payload
      const audioBuffer = await this.decodeRawPCM(arrayBuffer);
      this.audioQueue.push(audioBuffer);

      if (!this.isPlayingAudio) {
        this.playNextAudioChunk();
      }
    } catch (err) {
      diagnostics.logError(`Audio decoding failed: ${err}`);
      diagnostics.update({ playbackStatus: 'error' });
    }
  }

  private async decodeRawPCM(pcmBuffer: ArrayBuffer): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('AudioContext missing');

    const int16 = new Int16Array(pcmBuffer);
    const float32 = new Float32Array(int16.length);

    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32.length, this.config.sampleRate);
    audioBuffer.copyToChannel(float32, 0);
    return audioBuffer;
  }

  private playNextAudioChunk() {
    if (this.audioQueue.length === 0) {
      this.isPlayingAudio = false;
      diagnostics.update({ playbackStatus: 'idle' });
      return;
    }

    if (!this.audioContext) return;

    this.isPlayingAudio = true;
    diagnostics.update({ playbackStatus: 'playing' });

    const buffer = this.audioQueue.shift()!;
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    source.onended = () => {
      this.playNextAudioChunk();
    };

    source.start(0);
  }

  /**
   * Auto-recovery without app reload (exponential backoff)
   */
  private async handleDisconnectAndRecover() {
    if (this.isAutoRecovering) return;
    this.isAutoRecovering = true;
    this.reconnectAttempts++;

    const delay = Math.min(10000, 1000 * Math.pow(1.5, this.reconnectAttempts));
    diagnostics.logError(`Connection lost. Self-healing in ${Math.round(delay / 1000)}s (Attempt ${this.reconnectAttempts})`);

    setTimeout(async () => {
      this.isAutoRecovering = false;
      const ok = await this.connectLiveSession();
      if (ok && this.isRecording) {
        await this.startStreaming();
      }
    }, delay);
  }

  /**
   * Explicit manual recovery action
   */
  public async forceSubsystemRecovery() {
    diagnostics.logError('Manual Voice Subsystem Recovery Triggered');
    this.stopStreaming();
    diagnostics.resetMetrics();
    await this.initMicrophone();
    await this.connectLiveSession();
    await this.startStreaming();
  }

  public stopStreaming() {
    this.isRecording = false;
    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }
  }

  public dispose() {
    this.stopStreaming();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
    }
    if (this.socket) {
      this.socket.close();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
