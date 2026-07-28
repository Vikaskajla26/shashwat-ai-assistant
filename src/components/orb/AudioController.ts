export class AudioController {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private smoothedLevel = 0;

  public connectStream(stream: MediaStream) {
    this.initContext();
    if (!this.audioCtx) return;

    if (this.source) {
      try { this.source.disconnect(); } catch (_) {}
    }

    this.source = this.audioCtx.createMediaStreamSource(stream);
    this.source.connect(this.analyser!);
  }

  public connectElement(element: HTMLMediaElement) {
    this.initContext();
    if (!this.audioCtx) return;

    if (this.source) {
      try { this.source.disconnect(); } catch (_) {}
    }

    this.source = this.audioCtx.createMediaElementSource(element);
    this.source.connect(this.analyser!);
    this.analyser!.connect(this.audioCtx.destination);
  }

  private initContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public getAudioLevel(): number {
    if (!this.analyser || !this.dataArray) return 0;

    this.analyser.getByteTimeDomainData(this.dataArray);

    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const value = (this.dataArray[i] - 128) / 128;
      sum += value * value;
    }

    const rms = Math.sqrt(sum / this.dataArray.length);
    // Exponential Moving Average
    this.smoothedLevel = this.smoothedLevel * 0.75 + rms * 0.25;
    return Math.min(1.0, this.smoothedLevel * 3.0);
  }

  public dispose() {
    if (this.source) {
      try { this.source.disconnect(); } catch (_) {}
    }
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch (_) {}
    }
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
  }
}
