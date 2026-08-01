export interface PhysicalBodyParams {
  mass: number;          // Mass (m) in kg
  stiffness: number;     // Spring constant (k) N/m
  damping: number;       // Damping coefficient (c) Ns/m
  friction: number;      // Friction coefficient (μ)
  anticipation?: number; // Pre-motion pull-back ratio (0..0.15)
  overshootLimit?: number;// Maximum allowed overshoot ratio (1.0..1.12)
}

export interface BodyState {
  position: number;
  velocity: number;
  acceleration: number;
  target: number;
  isSettled: boolean;
}

/**
 * UnifiedPhysicsEngine — 2nd-order differential equation solver for physically
 * believable UI motion with mass, spring tension, damping friction, inertia,
 * velocity, anticipation, controlled overshoot, and settling.
 */
export class UnifiedPhysicsEngine {
  private mass: number;
  private stiffness: number;
  private damping: number;
  private friction: number;
  private anticipation: number;
  private overshootLimit: number;

  private state: BodyState = {
    position: 0,
    velocity: 0,
    acceleration: 0,
    target: 0,
    isSettled: true,
  };

  constructor(params: PhysicalBodyParams) {
    this.mass = Math.max(0.1, params.mass);
    this.stiffness = Math.max(1, params.stiffness);
    this.damping = Math.max(0, params.damping);
    this.friction = Math.max(0, params.friction);
    this.anticipation = params.anticipation || 0;
    this.overshootLimit = params.overshootLimit || 1.08;
  }

  public setTarget(target: number, initialVelocity = 0): void {
    if (this.state.target !== target) {
      this.state.target = target;
      this.state.velocity += initialVelocity;
      this.state.isSettled = false;

      // Apply subtle physical anticipation pull-back if configured
      if (this.anticipation > 0 && Math.abs(target - this.state.position) > 0.01) {
        const delta = target - this.state.position;
        this.state.position -= delta * this.anticipation;
      }
    }
  }

  public update(dtSeconds: number): BodyState {
    if (this.state.isSettled) return this.state;

    const dt = Math.min(0.033, dtSeconds);

    // Spring restoration force: F_spring = -k * (x - target)
    const displacement = this.state.position - this.state.target;
    const springForce = -this.stiffness * displacement;

    // Damping & friction forces: F_damping = -c * v, F_friction = -μ * sign(v)
    const dampingForce = -this.damping * this.state.velocity;
    const frictionForce = -this.friction * Math.sign(this.state.velocity);

    const netForce = springForce + dampingForce + frictionForce;
    this.state.acceleration = netForce / this.mass;

    // Semi-implicit Euler integration for energy conservation
    this.state.velocity += this.state.acceleration * dt;
    this.state.position += this.state.velocity * dt;

    // Enforce physical overshoot clamp to prevent unnatural explosive oscillation
    const distanceToTarget = Math.abs(this.state.target);
    if (distanceToTarget > 0.001 && this.overshootLimit > 1.0) {
      const maxAllowed = this.state.target * this.overshootLimit;
      const minAllowed = this.state.target * (2.0 - this.overshootLimit);
      if (this.state.target > 0) {
        this.state.position = Math.min(this.state.position, maxAllowed);
      } else {
        this.state.position = Math.max(this.state.position, minAllowed);
      }
    }

    // Settling check (critically damped resting state)
    if (Math.abs(displacement) < 0.001 && Math.abs(this.state.velocity) < 0.005) {
      this.state.position = this.state.target;
      this.state.velocity = 0;
      this.state.acceleration = 0;
      this.state.isSettled = true;
    }

    return this.state;
  }

  public getPosition(): number {
    return this.state.position;
  }

  public isSettled(): boolean {
    return this.state.isSettled;
  }
}
