/**
 * Audio Reactive Processing & Smoothing Module for Orb Renderer.
 */

export class OrbAudioProcessor {
  private smoothedLevel = 0;
  private attackFactor = 0.35;
  private decayFactor = 0.12;

  public processAudioLevel(rawLevel: number): number {
    const validLevel = typeof rawLevel === 'number' && !isNaN(rawLevel) ? Math.max(0, Math.min(1.0, rawLevel)) : 0;

    if (validLevel > this.smoothedLevel) {
      this.smoothedLevel += (validLevel - this.smoothedLevel) * this.attackFactor;
    } else {
      this.smoothedLevel += (validLevel - this.smoothedLevel) * this.decayFactor;
    }

    return this.smoothedLevel;
  }

  public getSmoothedLevel(): number {
    return this.smoothedLevel;
  }

  public reset(): void {
    this.smoothedLevel = 0;
  }
}
