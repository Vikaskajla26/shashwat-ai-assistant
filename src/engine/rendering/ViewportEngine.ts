export type ViewportBreakpoint = 'mobile' | 'tablet' | 'desktop' | 'ultrawide';

export interface ViewportState {
  width: number;
  height: number;
  aspectRatio: number;
  breakpoint: ViewportBreakpoint;
  isPortrait: boolean;
  isMobile: boolean;
}

export type ViewportCallback = (state: ViewportState) => void;

/**
 * ViewportEngine — Monitors screen dimensions, orientation, and responsive breakpoints.
 */
export class ViewportEngine {
  private static instance: ViewportEngine | null = null;
  private callbacks: Set<ViewportCallback> = new Set();
  private currentState: ViewportState;

  public static getInstance(): ViewportEngine {
    if (!this.instance) {
      this.instance = new ViewportEngine();
    }
    return this.instance;
  }

  constructor() {
    this.currentState = this.calculateState();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleResize, { passive: true });
    }
  }

  public getState(): ViewportState {
    return this.currentState;
  }

  public subscribe(cb: ViewportCallback): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }

  private handleResize = () => {
    this.currentState = this.calculateState();
    this.callbacks.forEach((cb) => cb(this.currentState));
  };

  private calculateState(): ViewportState {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const height = typeof window !== 'undefined' ? window.innerHeight : 800;
    const aspectRatio = width / (height || 1);
    const isPortrait = height > width;

    let breakpoint: ViewportBreakpoint = 'desktop';
    if (width < 640) {
      breakpoint = 'mobile';
    } else if (width < 1024) {
      breakpoint = 'tablet';
    } else if (width >= 1920) {
      breakpoint = 'ultrawide';
    }

    return {
      width,
      height,
      aspectRatio: parseFloat(aspectRatio.toFixed(3)),
      breakpoint,
      isPortrait,
      isMobile: breakpoint === 'mobile',
    };
  }
}
