export interface FPSMetrics {
  fps: number;
  frameTimeMs: number;
  isLowPerformance: boolean;
  dropCount: number;
}

export type FPSCallback = (metrics: FPSMetrics) => void;

/**
 * FPSMonitor — Real-time frame rate & delta time tracking engine.
 * Computes rolling average frame rate and alerts adaptive quality engine of frame drops.
 */
export class FPSMonitor {
  private static instance: FPSMonitor | null = null;
  private frameCount = 0;
  private lastTime = performance.now();
  private sampleWindow: number[] = [];
  private callbacks: Set<FPSCallback> = new Set();
  private animFrameId: number | null = null;
  private isRunning = false;
  private dropCount = 0;

  private currentMetrics: FPSMetrics = {
    fps: 60,
    frameTimeMs: 16.6,
    isLowPerformance: false,
    dropCount: 0,
  };

  public static getInstance(): FPSMonitor {
    if (!this.instance) {
      this.instance = new FPSMonitor();
    }
    return this.instance;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public subscribe(cb: FPSCallback): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }

  public getMetrics(): FPSMetrics {
    return this.currentMetrics;
  }

  private loop = () => {
    if (!this.isRunning) return;

    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    if (delta > 0 && delta < 1000) {
      this.sampleWindow.push(delta);
      if (this.sampleWindow.length > 60) {
        this.sampleWindow.shift();
      }

      const avgDelta = this.sampleWindow.reduce((a, b) => a + b, 0) / this.sampleWindow.length;
      const currentFPS = Math.round(1000 / avgDelta);

      if (currentFPS < 30) {
        this.dropCount++;
      }

      this.currentMetrics = {
        fps: currentFPS,
        frameTimeMs: parseFloat(avgDelta.toFixed(2)),
        isLowPerformance: currentFPS < 40,
        dropCount: this.dropCount,
      };

      this.callbacks.forEach((cb) => cb(this.currentMetrics));
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };
}
