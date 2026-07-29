import * as THREE from 'three';

/**
 * The 14 Maheshwar Sutras (Maheshvara Sutrani) — the primal phonemes of
 * creation in Sanskrit grammar. These orbit the AI core as holographic streams.
 */
export const MAHESHWAR_SUTRAS = [
  'अइउण्',
  'ऋऌक्',
  'एओङ्',
  'ऐऔच्',
  'हयवरट्',
  'लण्',
  'ञमङणनम्',
  'झभञ्',
  'घढधष्',
  'जबगडदश्',
  'खफछठथचटत्',
  'कपय्',
  'शषसर्',
  'हल्',
];

/**
 * Create a high-quality canvas texture for a Sanskrit holographic text sprite.
 * White core + colored additive glow so the sutras read as luminous holograms
 * rather than flat labels.
 */
export function createSanskritTextTexture(
  text: string,
  colorHex = '#F59E0B',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Layered additive glow for a holographic falloff.
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 28;
  ctx.font = '500 50px "Noto Serif Devanagari", "Rozha One", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  // Second pass tightens the glyph for legibility over the bloom.
  ctx.shadowBlur = 8;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.anisotropy = 4;
  return texture;
}
