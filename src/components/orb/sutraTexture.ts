import * as THREE from 'three';

/**
 * The 14 Maheshwar Sutras (Maheshvara Sutrani) — the primal phonemes of
 * creation in Sanskrit grammar, rendered as flowing holographic data streams.
 */
export const MAHESHWAR_SUTRAS = [
  'अ इ उ ण्',
  'ऋ ऌ क्',
  'ए ओ ङ्',
  'ऐ औ च्',
  'ह य व र ट्',
  'ल ण्',
  'ञ म ङ ण न म्',
  'झ भ ञ्',
  'घ ढ ध ष्',
  'ज ब ग ड द श्',
  'ख फ छ ठ थ च ट त ख्',
  'क प य्',
  'श ष स र्',
  'हल्',
];

export const SUTRA_COLOR_PALETTES = [
  '#f59e0b', // Golden Amber
  '#06b6d4', // Cyber Cyan
  '#a855f7', // Deep Violet
];

/**
 * Creates a high-definition canvas texture for a holographic Devanagari stream.
 * Includes horizontal gradient alpha fading for seamless edge dissolution.
 */
export function createSanskritTextTexture(
  text: string,
  colorHex = '#f59e0b',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Additive Holographic Glow Pass
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 32;
  ctx.font = '500 46px "Noto Serif Devanagari", "Rozha One", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  // 2. High-precision legibility core pass
  ctx.shadowBlur = 10;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  // 3. Edge Dissolve Gradient Mask (Fades naturally at stream boundaries)
  const maskGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  maskGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
  maskGrad.addColorStop(0.15, 'rgba(0, 0, 0, 0)');
  maskGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0)');
  maskGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');

  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = maskGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.anisotropy = 8;
  return texture;
}
