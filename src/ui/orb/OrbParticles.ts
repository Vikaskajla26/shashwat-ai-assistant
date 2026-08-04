/**
 * Bioluminescent Particle Ecosystem Renderer for Orb UI.
 * Handles orbiting, pulsing, and neural golden sparks depending on AI state.
 */

import { OrbStateConfig } from './OrbStates';

export interface Particle {
  angle: number;
  radiusOffset: number;
  speed: number;
  size: number;
  alpha: number;
}

export class OrbParticleSystem {
  private particles: Particle[] = [];

  constructor(count = 50) {
    this.initParticles(count);
  }

  public initParticles(count: number): void {
    this.particles = Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * Math.PI * 2,
      radiusOffset: (Math.random() - 0.5) * 28,
      speed: 0.005 + Math.random() * 0.015,
      size: 1.5 + Math.random() * 2.8,
      alpha: 0.3 + Math.random() * 0.65,
    }));
  }

  public updateAndDraw(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    coreRadius: number,
    time: number,
    config: OrbStateConfig,
    audioLevel: number,
    isLearningState: boolean
  ): void {
    if (this.particles.length !== config.particleCount) {
      this.initParticles(config.particleCount);
    }

    this.particles.forEach((p) => {
      p.angle += p.speed * config.particleSpeed * (1 + audioLevel * 1.5);
      const r = coreRadius + p.radiusOffset + Math.sin(time * 2 + p.angle * 3) * 8;
      const px = centerX + Math.cos(p.angle) * r;
      const py = centerY + Math.sin(p.angle) * r;

      ctx.fillStyle = isLearningState ? '#FACC15' : config.particleColor;
      ctx.globalAlpha = p.alpha * (0.6 + audioLevel * 0.4);
      ctx.beginPath();
      ctx.arc(px, py, isLearningState ? p.size * 1.3 : p.size, 0, Math.PI * 2);
      ctx.fill();

      // Neural golden sparks when in Learning state
      if (isLearningState && Math.random() > 0.85) {
        ctx.strokeStyle = '#FEF08A';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(centerX, centerY);
        ctx.stroke();
      }
    });

    ctx.globalAlpha = 1.0;
  }
}
