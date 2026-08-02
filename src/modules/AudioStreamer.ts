/**
 * AudioStreamer for Shashwat AI OS.
 * Captures 16kHz 16-bit mono Int16 PCM audio from mic for persistent Gemini Live streaming.
 * Includes real-time adaptive VAD (Voice Activity Detection) energy calculation.
 */

export class AudioStreamer {
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private onAudioChunk?: (base64Pcm: string) => void;
  private onVadEnergy?: (energyNorm: number, isSpeech: boolean) => void;
  private isStreaming = false;

  private noiseFloor = 0.01;
  private speechThreshold = 0.04;

  public async start(
    onChunk: (base64Pcm: string) => void,
    onVad?: (energyNorm: number, isSpeech: boolean) => void
  ): Promise<void> {
    if (this.isStreaming) return;
    this.onAudioChunk = onChunk;
    this.onVadEnergy = onVad;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx({ sampleRate: 16000 });
      const source = this.audioCtx.createMediaStreamSource(this.mediaStream);

      // ScriptProcessorNode for 16kHz PCM chunk extraction (2048 buffer size = ~128ms chunks)
      this.scriptProcessor = this.audioCtx.createScriptProcessor(2048, 1, 1);

      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isStreaming) return;
        const inputData = e.inputBuffer.getChannelData(0);

        // 1. Calculate RMS VAD energy
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);

        // Adaptive noise floor calculation
        if (rms < this.noiseFloor) {
          this.noiseFloor = this.noiseFloor * 0.95 + rms * 0.05;
        }

        const isSpeech = rms > Math.max(this.speechThreshold, this.noiseFloor * 3.5);

        if (this.onVadEnergy) {
          this.onVadEnergy(Math.min(1.0, rms * 8.0), isSpeech);
        }

        // 2. Convert Float32 to Int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // 3. Convert Int16 PCM bytes to Base64
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Pcm = btoa(binary);

        if (this.onAudioChunk) {
          this.onAudioChunk(base64Pcm);
        }
      };

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioCtx.destination);
      this.isStreaming = true;
    } catch (err) {
      console.error('[AudioStreamer] Failed to acquire microphone stream:', err);
      throw err;
    }
  }

  public stop(): void {
    this.isStreaming = false;
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch (_) {}
      this.scriptProcessor = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (_) {}
      this.audioCtx = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  public getIsStreaming(): boolean {
    return this.isStreaming;
  }
}
