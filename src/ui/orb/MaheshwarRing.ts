/**
 * Maheshwar Sutras (माहेश्वर सूत्राणि) Sacred Glyph Ring Renderer.
 * Renders the orbiting Devanagari Sanskrit phonetic ring around the bioluminescent orb core.
 */

import { OrbStateConfig } from './OrbStates';

const MAHESHWAR_SUTRA_TEXT = 'अइउण् ऋऌक् एओङ् ऐऔच् हयवरट् लण् ञमङणनम् झभञ् घढधष् जबगडदश् खफछठथचटत्व् कपय् शषसर् हल्';

export class MaheshwarRingRenderer {
  private chars: string[];
  private angleStep: number;

  constructor() {
    this.chars = MAHESHWAR_SUTRA_TEXT.split('');
    this.angleStep = (Math.PI * 2) / this.chars.length;
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    orbitRadius: number,
    time: number,
    config: OrbStateConfig,
    audioLevel: number
  ): void {
    ctx.save();
    ctx.font = '11px "Noto Serif Devanagari", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const rotSpeed = config.rotationSpeed * (1 + audioLevel * 0.8);

    this.chars.forEach((char, i) => {
      const rotAngle = time * rotSpeed * 0.15 + i * this.angleStep;
      const sx = centerX + Math.cos(rotAngle) * orbitRadius;
      const sy = centerY + Math.sin(rotAngle) * orbitRadius;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(rotAngle + Math.PI / 2);
      ctx.fillStyle = config.fresnelColor;
      ctx.globalAlpha = Math.max(0.2, 0.45 + Math.sin(time * 2 + i) * 0.25 + audioLevel * 0.35);
      ctx.shadowColor = config.accentColor;
      ctx.shadowBlur = 8;
      ctx.fillText(char, 0, 0);
      ctx.restore();
    });

    ctx.restore();
  }
}
