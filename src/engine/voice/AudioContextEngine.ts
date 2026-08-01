export interface AudioSpectrumData {
  frequencyData: Uint8Array;
  volume: number;
  bassLevel: number;
  midLevel: number;
  trebleLevel: number;
}

/**
 * AudioContextEngine — Manages the browser Web Audio API graph, microphone stream,
 * and 64-band frequency matrix extraction for state visualizers.
 */
export class AudioContextEngine {
  private static instance: AudioContextEngine | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array = new Uint8Array(64);
  private isActive = false;

  public static getInstance(): AudioContextEngine {
    if (!this.instance) {
      this.instance = new AudioContextEngine();
    }
    return this.instance;
  }

  public async startMicrophone(): Promise<void> {
    if (this.isActive) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: 16000 });
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      this.sourceNode = this.ctx.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.analyser);

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.isActive = true;
    } catch (err) {
      console.warn('[AudioContextEngine] Microphone start warning:', err);
      throw err;
    }
  }

  public getSpectrum(): AudioSpectrumData {
    if (!this.analyser || !this.isActive) {
      return { frequencyData: this.dataArray, volume: 0, bassLevel: 0, midLevel: 0, trebleLevel: 0 };
    }

    this.analyser.getByteFrequencyData(this.dataArray);

    let sum = 0;
    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;

    const len = this.dataArray.length;
    for (let i = 0; i < len; i++) {
      const val = this.dataArray[i];
      sum += val;
      if (i < len * 0.2) bassSum += val;
      else if (i < len * 0.6) midSum += val;
      else trebleSum += val;
    }

    const volume = Math.round((sum / (len * 255)) * 100);
    return {
      frequencyData: this.dataArray,
      volume,
      bassLevel: Math.round((bassSum / (len * 0.2 * 255)) * 100),
      midLevel: Math.round((midSum / (len * 0.4 * 255)) * 100),
      trebleLevel: Math.round((trebleSum / (len * 0.4 * 255)) * 100),
    };
  }

  public stopMicrophone(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
      this.ctx = null;
    }
    this.isActive = false;
  }
}
