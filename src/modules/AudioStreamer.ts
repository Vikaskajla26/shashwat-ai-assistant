import { float32ToInt16Base64, calculateVolume } from '../utils/pcm';

export interface AudioStreamerOptions {
  onAudioData: (base64Pcm: string) => void;
  onVolumeChange?: (volume: number) => void;
  onError?: (error: Error) => void;
}

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isRecording = false;
  private isMuted = false;

  private onAudioData: (base64Pcm: string) => void;
  private onVolumeChange?: (volume: number) => void;
  private onError?: (error: Error) => void;

  constructor(options: AudioStreamerOptions) {
    this.onAudioData = options.onAudioData;
    this.onVolumeChange = options.onVolumeChange;
    this.onError = options.onError;
  }

  public async start(): Promise<void> {
    if (this.isRecording) return;

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

      // Target 16kHz sample rate for Gemini Live PCM input
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 16000 });

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // ScriptProcessor with 2048 buffer size gives ~128ms chunks at 16kHz
      this.processorNode = this.audioContext.createScriptProcessor(2048, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isRecording || this.isMuted) return;

        const inputBuffer = e.inputBuffer.getChannelData(0);
        const volume = calculateVolume(inputBuffer);
        if (this.onVolumeChange) {
          this.onVolumeChange(volume);
        }

        const base64 = float32ToInt16Base64(inputBuffer);
        this.onAudioData(base64);
      };

      this.mediaStreamSource.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isRecording = true;
    } catch (err: any) {
      this.stop();
      if (this.onError) {
        this.onError(new Error(err?.message || 'Failed to access microphone'));
      }
      throw err;
    }
  }

  public stop(): void {
    this.isRecording = false;

    if (this.processorNode && this.mediaStreamSource) {
      try {
        this.processorNode.disconnect();
        this.mediaStreamSource.disconnect();
      } catch (_) {}
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.processorNode = null;
    this.mediaStreamSource = null;

    if (this.onVolumeChange) {
      this.onVolumeChange(0);
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted && this.onVolumeChange) {
      this.onVolumeChange(0);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public getActive(): boolean {
    return this.isRecording;
  }
}
