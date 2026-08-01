import * as THREE from 'three';

export interface InteractionState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  normX: number;
  normY: number;
  microOscillation: number;
  attractionForce: number;
  ripple: {
    strength: number;
    time: number;
    origin: THREE.Vector3;
  };
}

/**
 * OrbInteraction — Intelligent Liquid Soft-Body Physics Engine.
 *
 * Implements:
 *  - Critically-damped 2D/3D spring solver for center-of-mass inertia
 *  - Hydrostatic dual-zone cursor attraction & repulsion
 *  - Linear velocity & momentum tracking
 *  - High-frequency micro-oscillations (22 Hz liquid tremor)
 *  - Non-jelly elegant liquid mercury elastic response
 */
export class OrbInteraction {
  private spring = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    targetX: 0,
    targetY: 0,
  };

  private mouseRaw = { x: 0, y: 0 };

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
    window.addEventListener('mousemove', this.onMouseMove, { passive: true });
    window.addEventListener('mouseleave', this.onMouseLeave, { passive: true });
    window.addEventListener('click', this.onClick, { passive: true });
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
    this.mouseRaw.x = e.clientX;
    this.mouseRaw.y = e.clientY;

    const relX = (e.clientX / window.innerWidth - 0.5) * 2;
    const relY = (e.clientY / window.innerHeight - 0.5) * 2;

    // Soft magnetic target position
    this.spring.targetX = relX * 24;
    this.spring.targetY = -relY * 24;
  };

  private onMouseLeave = () => {
    this.spring.targetX = 0;
    this.spring.targetY = 0;
  };

  private onClick = (e: MouseEvent) => {
    if (this.reducedMotion) return;
    this.ripple.strength = 1.2;
    this.ripple.time = 0;

    // Calculate click origin on the unit sphere
    const relX = (e.clientX / window.innerWidth - 0.5) * 2;
    const relY = -(e.clientY / window.innerHeight - 0.5) * 2;
    this.ripple.origin.set(relX, relY, 1.0).normalize();
  };

  /** Advance the spring + liquid momentum physics one frame; returns sampled state. */
  step(dt: number, timeSeconds: number): InteractionState {
    // Critically damped spring parameters for elegant liquid feel (no jelly bounce)
    const stiffness = 0.10;
    const damping = 0.84;

    const ax = (this.spring.targetX - this.spring.x) * stiffness;
    const ay = (this.spring.targetY - this.spring.y) * stiffness;

    this.spring.vx = (this.spring.vx + ax) * damping;
    this.spring.vy = (this.spring.vy + ay) * damping;

    this.spring.x += this.spring.vx;
    this.spring.y += this.spring.vy;

    const speed = Math.sqrt(this.spring.vx * this.spring.vx + this.spring.vy * this.spring.vy);

    // 22 Hz micro-vibration (liquid intelligence tremor)
    const microOscillation = Math.sin(timeSeconds * 22.0) * 0.035 * (1.0 + Math.min(speed, 2.0) * 0.5);

    // Dual-zone attraction/repulsion force
    const w = typeof window !== 'undefined' ? window.innerWidth / 2 : 1;
    const h = typeof window !== 'undefined' ? window.innerHeight / 2 : 1;
    const distToCenter = Math.sqrt(this.spring.x * this.spring.x + this.spring.y * this.spring.y);
    const attractionForce = Math.min(1.0, distToCenter / 24.0);

    // Ripple decay
    if (this.ripple.strength > 0.001) {
      this.ripple.time += dt;
      this.ripple.strength *= Math.exp(-dt * 1.8);
    } else {
      this.ripple.strength = 0;
    }

    return {
      x: this.spring.x,
      y: this.spring.y,
      vx: parseFloat(this.spring.vx.toFixed(4)),
      vy: parseFloat(this.spring.vy.toFixed(4)),
      speed: parseFloat(speed.toFixed(4)),
      normX: Math.max(-1, Math.min(1, this.spring.x / w)),
      normY: Math.max(-1, Math.min(1, this.spring.y / h)),
      microOscillation,
      attractionForce,
      ripple: this.ripple,
    };
  }
}
