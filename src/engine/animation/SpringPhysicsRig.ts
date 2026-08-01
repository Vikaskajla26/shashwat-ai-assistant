export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
  velocity?: number;
}

export const SPRING_PRESETS: Record<string, SpringConfig> = {
  gentle: { stiffness: 120, damping: 14, mass: 1 },
  snappy: { stiffness: 220, damping: 18, mass: 0.8 },
  glassDock: { stiffness: 180, damping: 16, mass: 0.9 },
  orbital: { stiffness: 80, damping: 12, mass: 1.2 },
  bouncy: { stiffness: 300, damping: 10, mass: 0.6 },
};

/**
 * SpringPhysicsRig — Solves 1D/2D spring physics displacement equations for smooth,
 * natural interactive feedback without layout jitter.
 */
export class SpringPhysicsRig {
  private current = 0;
  private target = 0;
  private velocity = 0;
  private config: SpringConfig;

  constructor(config: SpringConfig = SPRING_PRESETS.snappy) {
    this.config = config;
  }

  public setTarget(value: number): void {
    this.target = value;
  }

  public setConfig(config: SpringConfig): void {
    this.config = config;
  }

  public update(dtSeconds: number): number {
    const force = (this.target - this.current) * this.config.stiffness;
    const dampingForce = -this.velocity * this.config.damping;
    const acceleration = (force + dampingForce) / this.config.mass;

    this.velocity += acceleration * dtSeconds;
    this.current += this.velocity * dtSeconds;

    return this.current;
  }

  public getValue(): number {
    return this.current;
  }

  public isAtRest(threshold = 0.001): boolean {
    return Math.abs(this.target - this.current) < threshold && Math.abs(this.velocity) < threshold;
  }
}
