import * as THREE from 'three';

/**
 * interaction.ts — mouse-spring follow, tilt, and click-ripple state for the orb.
 *
 * Kept as a plain controller (not React) so the render loop can sample it every
 * frame. The mouse-follow uses critically-damped spring physics for natural,
 * smooth motion; clicks seed a ripple that the plasma shader radiates as a
 * displacement wave (ripples originate from interaction points).
 */

export interface InteractionState {
  x: number;
  y: number;
  /** Current ripple envelope, read by PlasmaCore. */
  ripple: {
    strength: number;
    time: number;
    origin: THREE.Vector3;
  };
}

export class OrbInteraction {
  private spring = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    targetX: 0,
    targetY: 0,
  };

  ripple = {
    strength: 0,
    time: 0,
    origin: new THREE.Vector3(0, 0, 1),
  };

  private active = false;
  private reducedMotion = false;

  constructor() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }

  attach() {
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseleave', this.onMouseLeave);
    window.addEventListener('click', this.onClick);
    this.active = true;
  }

  detach() {
    if (!this.active) return;
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseleave', this.onMouseLeave);
    window.removeEventListener('click', this.onClick);
    this.active = false;
  }

  private onMouseMove = (e: MouseEvent) => {
    if (this.reducedMotion) return;
    const relX = (e.clientX / window.innerWidth - 0.5) * 2;
    const relY = (e.clientY / window.innerHeight - 0.5) * 2;
    this.spring.targetX = relX * 22;
    this.spring.targetY = -relY * 22;
  };

  private onMouseLeave = () => {
    this.spring.targetX = 0;
    this.spring.targetY = 0;
  };

  private onClick = () => {
    if (this.reducedMotion) return;
    // Seed a ripple from roughly the front of the sphere (viewer-facing pole).
    this.ripple.strength = 1.0;
    this.ripple.time = 0;
    this.ripple.origin.set(0, 0, 1);
  };

  /** Advance the spring + ripple one frame; returns the sampled state. */
  step(dt: number): InteractionState {
    const stiffness = 0.08;
    const damping = 0.82;

    const ax = (this.spring.targetX - this.spring.x) * stiffness;
    const ay = (this.spring.targetY - this.spring.y) * stiffness;
    this.spring.vx = (this.spring.vx + ax) * damping;
    this.spring.vy = (this.spring.vy + ay) * damping;
    this.spring.x += this.spring.vx;
    this.spring.y += this.spring.vy;

    // Ripple decays over ~1s.
    if (this.ripple.strength > 0.001) {
      this.ripple.time += dt;
      this.ripple.strength *= Math.exp(-dt * 1.6);
    } else {
      this.ripple.strength = 0;
    }

    return {
      x: this.spring.x,
      y: this.spring.y,
      ripple: this.ripple,
    };
  }
}
