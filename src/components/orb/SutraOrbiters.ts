import * as THREE from 'three';
import { MAHESHWAR_SUTRAS, createSanskritTextTexture } from './sutraTexture';
import type { StateTheme } from '../../theme/aiState';

/**
 * SutraOrbiters — the 14 Maheshwar Sutras as holographic streams orbiting the
 * AI core.
 *
 * Upgraded from the previous static tilted ring into drifting wave paths: each
 * sutra rides a Lissajous-style orbit with its own radius, inclination and
 * phase, gently fades in/out (sin envelopes), and reacts to listening /
 * reasoning (opacity + speed step up). Low base opacity keeps them spiritual
 * and futuristic rather than distracting.
 */

export interface SutraOrbitersHandle {
  group: THREE.Group;
  update: (t: number, theme: StateTheme, reactivity: number) => void;
  dispose: () => void;
}

interface SutraConfig {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  texture: THREE.CanvasTexture;
  radius: number;
  inclination: number;
  phase: number;
  speedJitter: number;
  yAmp: number;
}

export function createSutraOrbiters(): SutraOrbitersHandle {
  const group = new THREE.Group();
  group.rotation.x = 0.45; // tilt the whole field relative to the viewer

  const configs: SutraConfig[] = [];

  MAHESHWAR_SUTRAS.forEach((sutra, idx) => {
    const texture = createSanskritTextTexture(sutra, '#F59E0B');
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(22, 5.5, 1);

    const count = MAHESHWAR_SUTRAS.length;
    const baseAngle = (idx / count) * Math.PI * 2;

    configs.push({
      sprite,
      material,
      texture,
      radius: 40 + (idx % 3) * 4, // varied radii → layered streams
      inclination: 0.3 + (idx % 4) * 0.18,
      phase: baseAngle,
      speedJitter: 0.8 + (idx % 5) * 0.12,
      yAmp: 5 + (idx % 4) * 2.5,
    });

    group.add(sprite);
  });

  const update: SutraOrbitersHandle['update'] = (t, theme, reactivity) => {
    // reactivity ∈ [0..1] — bumps during listening/reasoning.
    const speed = theme.sutraSpeed * (1 + reactivity * 1.4);
    const baseOpacity = theme.sutraOpacity * (1 + reactivity * 0.6);

    configs.forEach((cfg, idx) => {
      const angle = cfg.phase + t * speed * cfg.speedJitter;
      const r = cfg.radius;
      // Lissajous-style drift: x/z orbit + sinusoidal y for an elegant wave path.
      cfg.sprite.position.x = Math.cos(angle) * r;
      cfg.sprite.position.z = Math.sin(angle) * r;
      cfg.sprite.position.y =
        Math.sin(angle * 2 + idx) * cfg.yAmp +
        Math.sin(t * 0.4 + idx) * 3 * cfg.inclination;

      // Gentle, non-uniform fade envelope so sutras breathe in and out.
      const fade = Math.sin(t * 0.6 + idx * 0.9) * 0.35 + 0.65;
      cfg.material.opacity = baseOpacity * fade;
    });

    group.rotation.y = t * speed * 0.25;
  };

  const dispose = () => {
    configs.forEach((cfg) => {
      cfg.texture.dispose();
      cfg.material.dispose();
    });
  };

  return { group, update, dispose };
}
