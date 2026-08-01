export interface AudioSpectrumData {
  frequencyData: Uint8Array;
  volume: number;        // 0..100 raw volume
  volumeNorm: number;    // 0..1 smoothed RMS volume (Fresnel Rim Light & Light Intensity)
  bassNorm: number;      // 0..1 smoothed Bass (Surface Deformation & Orb Breathing Pulse)
  midNorm: number;       // 0..1 smoothed Mid (Inner Plasma Swirl Speed & Convection)
  trebleNorm: number;    // 0..1 smoothed Treble (Particle Emission Rate & Micro-Sparks)
}

/**
 * AudioContextEngine — Web Audio API Microphone Voice Engine.
 * Extracts FFT frequency bands (Bass, Mid, Treble, RMS Volume) and applies
 * exponential temporal smoothing (critically damped lerp) for zero-flash,
 * natural living orb voice reactivity.
 */
export class AudioContextEngine {
  private static instance: AudioContextEngine | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array = new Uint8Array(64);
  private isActive = false;

  // Smoothed spectral energy states for natural, non-harsh orb organic movement
  private smoothedVolume = 0;
  private smoothedBass = 0;
  private smoothedMid = 0;
  private smoothedTreble = 0;

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
      this.analyser.smoothingTimeConstant = 0.85;

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
      // Natural decay to 0 when inactive
      this.smoothedVolume += (0 - this.smoothedVolume) * 0.08;
      this.smoothedBass += (0 - this.smoothedBass) * 0.08;
      this.smoothedMid += (0 - this.smoothedMid) * 0.08;
      this.smoothedTreble += (0 - this.smoothedTreble) * 0.08;

      return {
        frequencyData: this.dataArray,
        volume: 0,
        volumeNorm: parseFloat(this.smoothedVolume.toFixed(3)),
        bassNorm: parseFloat(this.smoothedBass.toFixed(3)),
        midNorm: parseFloat(this.smoothedMid.toFixed(3)),
        trebleNorm: parseFloat(this.smoothedTreble.toFixed(3)),
      };
    }

    this.analyser.getByteFrequencyData(this.dataArray);

    let sum = 0;
    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;

    const len = this.dataArray.length;
    const bassBins = Math.floor(len * 0.25);
    const midBins = Math.floor(len * 0.65);

    for (let i = 0; i < len; i++) {
      const val = this.dataArray[i];
      sum += val;
      if (i < bassBins) bassSum += val;
      else if (i < midBins) midSum += val;
      else trebleSum += val;
    }

    const rawVolNorm = Math.min(1.0, sum / (len * 180));
    const rawBassNorm = Math.min(1.0, bassSum / (bassBins * 180));
    const rawMidNorm = Math.min(1.0, midSum / ((midBins - bassBins) * 180));
    const rawTrebleNorm = Math.min(1.0, trebleSum / ((len - midBins) * 180));

    // Exponential smoothing (critically damped lerp: zero flashing, smooth organic energy waves)
    this.smoothedVolume += (rawVolNorm - this.smoothedVolume) * 0.09;
    this.smoothedBass += (rawBassNorm - this.smoothedBass) * 0.08;
    this.smoothedMid += (rawMidNorm - this.smoothedMid) * 0.07;
    this.smoothedTreble += (rawTrebleNorm - this.smoothedTreble) * 0.06;

    return {
      frequencyData: this.dataArray,
      volume: Math.round(this.smoothedVolume * 100),
      volumeNorm: parseFloat(this.smoothedVolume.toFixed(3)),
      bassNorm: parseFloat(this.smoothedBass.toFixed(3)),
      midNorm: parseFloat(this.smoothedMid.toFixed(3)),
      trebleNorm: parseFloat(this.smoothedTreble.toFixed(3)),
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
