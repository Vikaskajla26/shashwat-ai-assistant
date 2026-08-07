/**
 * AudioPlayer for Shashwat AI OS.
 * Manages Web Audio API playback of 16kHz PCM audio chunks streamed from Gemini Live API.
 * Supports instant barge-in playback clearing and volume spectrum analysis.
 */

export interface AudioPlayerOptions {
  onVolumeChange?: (vol: number) => void;
  onPlaybackEnded?: () => void;
}

export class AudioPlayer {
  private audioCtx: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isPlaying = false;
  private scheduledTime = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private onEndedCallback?: () => void;
  private volumeCallback?: (vol: number) => void;
  private animFrame = 0;

  constructor(options?: AudioPlayerOptions) {
    if (options?.onPlaybackEnded) {
      this.onEndedCallback = options.onPlaybackEnded;
    }
    if (options?.onVolumeChange) {
      this.volumeCallback = options.onVolumeChange;
    }
    this.initAudioContext();
  }

  private initAudioContext() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        // Use native hardware sample rate to avoid driver resampling distortion
        this.audioCtx = new AudioCtx();
        this.analyserNode = this.audioCtx.createAnalyser();
        this.analyserNode.fftSize = 64;
        this.analyserNode.smoothingTimeConstant = 0.8;
        this.analyserNode.connect(this.audioCtx.destination);
      }
    } catch (e) {
      console.warn('[AudioPlayer] AudioContext init notice:', e);
    }
  }

  public unlockAudio(): void {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  public playChunk(base64Pcm: string, sampleRate = 24000): void {
    this.unlockAudio();
    if (!this.audioCtx) return;

    try {
      const binaryStr = atob(base64Pcm);
      const len = binaryStr.length;
      if (len < 2) return;

      // Ensure 2-byte alignment for Int16 samples
      const evenLen = len - (len % 2);
      const arrayBuffer = new ArrayBuffer(evenLen);
      const dataView = new DataView(arrayBuffer);

      for (let i = 0; i < evenLen; i += 2) {
        const byte1 = binaryStr.charCodeAt(i);
        const byte2 = binaryStr.charCodeAt(i + 1);
        const int16Val = (byte2 << 8) | byte1;
        const signedVal = int16Val >= 0x8000 ? int16Val - 0x10000 : int16Val;
        dataView.setInt16(i, signedVal, true); // Little-endian Int16
      }

      const pcm16 = new Int16Array(arrayBuffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      // Create Web Audio Buffer with original PCM sample rate (e.g. 24kHz)
      const buffer = this.audioCtx.createBuffer(1, float32.length, sampleRate);
      buffer.getChannelData(0).set(float32);

      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;

      if (this.analyserNode) {
        source.connect(this.analyserNode);
      } else {
        source.connect(this.audioCtx.destination);
      }

      // Precise Sequential Audio Buffer Scheduling
      const now = this.audioCtx.currentTime;
      if (this.scheduledTime < now) {
        this.scheduledTime = now + 0.005; // 5ms buffer offset
      }

      source.start(this.scheduledTime);
      this.scheduledTime += buffer.duration;

      this.activeSources.add(source);
      this.isPlaying = true;
      this.startVolumeMonitoring();

      source.onended = () => {
        this.activeSources.delete(source);
        if (this.activeSources.size === 0) {
          this.isPlaying = false;
          this.stopVolumeMonitoring();
          if (this.onEndedCallback) {
            this.onEndedCallback();
          }
        }
      };
    } catch (err) {
      console.error('[AudioPlayer] Error playing audio chunk:', err);
    }
  }

  /** Instant barge-in interruption: immediately stops all active audio playback */
  public stopAndClear(): void {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch (_) {}
    });
    this.activeSources.clear();
    this.isPlaying = false;
    if (this.audioCtx) {
      this.scheduledTime = this.audioCtx.currentTime;
    }
    this.stopVolumeMonitoring();
  }

  public interrupt(): void {
    this.stopAndClear();
  }

  public stop(): void {
    this.stopAndClear();
  }

  public setOnEnded(cb: () => void): void {
    this.onEndedCallback = cb;
  }

  public setVolumeCallback(cb: (vol: number) => void): void {
    this.volumeCallback = cb;
  }

  private startVolumeMonitoring() {
    if (this.animFrame) return;
    const monitor = () => {
      if (!this.isPlaying || !this.analyserNode) {
        if (this.volumeCallback) this.volumeCallback(0);
        this.animFrame = 0;
        return;
      }

      const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.analyserNode.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const volNorm = Math.min(1.0, avg / 128.0);

      if (this.volumeCallback) {
        this.volumeCallback(volNorm);
      }

      this.animFrame = requestAnimationFrame(monitor);
    };
    this.animFrame = requestAnimationFrame(monitor);
  }

  private stopVolumeMonitoring() {
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = 0;
    }
    if (this.volumeCallback) {
      this.volumeCallback(0);
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
