/**
 * Orb Shaders & Procedural Plasma Circulation Math.
 */

import { OrbStateConfig } from './OrbStates';

export class OrbShaderEngine {
  /** Draw outer radial glow gradient */
  public drawOuterGlow(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    glowRadius: number,
    config: OrbStateConfig
  ): void {
    const outerGlow = ctx.createRadialGradient(
      centerX,
      centerY,
      glowRadius * 0.25,
      centerX,
      centerY,
      glowRadius
    );
    outerGlow.addColorStop(0, config.baseColor + '90');
    outerGlow.addColorStop(0.5, config.accentColor + '35');
    outerGlow.addColorStop(1, 'transparent');

    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Draw morphing bioluminescent plasma sphere core */
  public drawPlasmaCore(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    time: number,
    config: OrbStateConfig,
    audioLevel: number,
    isThinkingState: boolean
  ): void {
    const coreGradient = ctx.createRadialGradient(
      centerX - radius * 0.3,
      centerY - radius * 0.3,
      radius * 0.1,
      centerX,
      centerY,
      radius
    );
    coreGradient.addColorStop(0, '#FFFFFF');
    coreGradient.addColorStop(0.4, config.fresnelColor);
    coreGradient.addColorStop(0.75, config.accentColor);
    coreGradient.addColorStop(1, config.baseColor + 'DD');

    ctx.fillStyle = coreGradient;
    ctx.beginPath();

    const points = 36;
    const plasmaMod = isThinkingState ? 2.5 : 1.0;

    for (let i = 0; i <= points; i++) {
      const theta = (i / points) * Math.PI * 2;
      const deformA = Math.sin(theta * 3 + time * config.breathSpeed * 2 * plasmaMod) * (3 + audioLevel * 14) * config.deformationAmp;
      const deformB = Math.cos(theta * 5 - time * config.breathSpeed * 1.5 * plasmaMod) * (2 + audioLevel * 10);
      const r = radius + deformA + deformB;
      const x = centerX + Math.cos(theta) * r;
      const y = centerY + Math.sin(theta) * r;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  /** Draw Fresnel Rim Envelope */
  public drawFresnelRim(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    config: OrbStateConfig
  ): void {
    ctx.strokeStyle = config.fresnelColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = config.fresnelColor;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.98, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}
