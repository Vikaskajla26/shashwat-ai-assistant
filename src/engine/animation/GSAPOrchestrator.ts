import { gsap } from 'gsap';

export interface SequenceStep {
  target: string | Element | Element[] | object;
  vars: gsap.TweenVars;
  position?: string | number;
}

/**
 * GSAPOrchestrator — Central master timeline manager for orchestrating complex
 * multi-step UI transitions, modal unveils, and orb state morphs.
 */
export class GSAPOrchestrator {
  private static instance: GSAPOrchestrator | null = null;
  private masterTimeline: gsap.core.Timeline;

  public static getInstance(): GSAPOrchestrator {
    if (!this.instance) {
      this.instance = new GSAPOrchestrator();
    }
    return this.instance;
  }

  constructor() {
    this.masterTimeline = gsap.timeline({ paused: true, defaults: { ease: 'power3.out', duration: 0.6 } });
  }

  public createSequence(steps: SequenceStep[]): gsap.core.Timeline {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.5 } });
    steps.forEach((step) => {
      tl.to(step.target, step.vars, step.position);
    });
    return tl;
  }

  public animateIn(target: string | Element, vars: gsap.TweenVars = {}): gsap.core.Tween {
    return gsap.fromTo(
      target,
      { opacity: 0, y: 16, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out', ...vars }
    );
  }

  public animateOut(target: string | Element, vars: gsap.TweenVars = {}): gsap.core.Tween {
    return gsap.to(target, {
      opacity: 0,
      y: -12,
      scale: 0.96,
      duration: 0.35,
      ease: 'power3.in',
      ...vars,
    });
  }

  public killAll(): void {
    gsap.killTweensOf('*');
    this.masterTimeline.clear();
  }
}
