import { base64ToInt16Float32, calculateVolume } from '../utils/pcm';

export interface AudioPlayerOptions {
  onVolumeChange?: (volume: number) => void;
  onPlaybackEnded?: () => void;
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private onVolumeChange?: (volume: number) => void;
  private onPlaybackEnded?: () => void;
  private isPlaying = false;
  private endCheckTimeout: any = null;

  constructor(options: AudioPlayerOptions = {}) {
    this.onVolumeChange = options.onVolumeChange;
    this.onPlaybackEnded = options.onPlaybackEnded;
  }

  private initAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      // Gemini Live model outputs 24kHz PCM audio; interactive hint minimizes output latency
      this.audioContext = new AudioCtx({ sampleRate: 24000, latencyHint: 'interactive' });
    }
    if (this.audioContext.state === 'suspended') {
      // Browser blocks autoplay — resume on gesture or force with unlockAudio
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  /** Call once after a user gesture (click/key) to unlock audio output. */
  public unlockAudio(): void {
    const ctx = this.initAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // Play a silent buffer to kick the audio graph alive in Safari/Chromium
    try {
      const buf = ctx.createBuffer(1, 1, 24000);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch (_) {}
  }

  public playChunk(base64Pcm: string): void {
    if (!base64Pcm) return;

    const ctx = this.initAudioContext();
    const float32Array = base64ToInt16Float32(base64Pcm);

    if (float32Array.length === 0) return;

    // Calculate volume for visualizer
    const vol = calculateVolume(float32Array);
    if (this.onVolumeChange) {
      this.onVolumeChange(vol);
    }

    const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    this.activeSources.push(source);
    this.isPlaying = true;

    source.onended = () => {
      const index = this.activeSources.indexOf(source);
      if (index > -1) {
        this.activeSources.splice(index, 1);
      }

      if (this.activeSources.length === 0) {
        this.isPlaying = false;
        if (this.onVolumeChange) {
          this.onVolumeChange(0);
        }
        
        clearTimeout(this.endCheckTimeout);
        this.endCheckTimeout = setTimeout(() => {
          if (this.activeSources.length === 0 && this.onPlaybackEnded) {
            this.onPlaybackEnded();
          }
        }, 150);
      }
    };
  }

  public interrupt(): void {
    // Stop all playing and scheduled sources immediately
    this.activeSources.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch (_) {}
    });
    this.activeSources = [];

    if (this.audioContext) {
      this.nextStartTime = this.audioContext.currentTime;
    } else {
      this.nextStartTime = 0;
    }

    this.isPlaying = false;
    clearTimeout(this.endCheckTimeout);

    if (this.onVolumeChange) {
      this.onVolumeChange(0);
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying || this.activeSources.length > 0;
  }

  public close(): void {
    this.interrupt();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
