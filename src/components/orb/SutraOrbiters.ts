import * as THREE from 'three';
import { MAHESHWAR_SUTRAS, SUTRA_COLOR_PALETTES, createSanskritTextTexture } from './sutraTexture';
import type { StateTheme } from '../../theme/aiState';

export interface SutraOrbitersHandle {
  group: THREE.Group;
  update: (t: number, theme: StateTheme, reactivity: number, isReasoning?: boolean) => void;
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

/**
 * SutraOrbiters — Holographic Devanagari Maheshwar Sutras Streams.
 * Renders 14 primal phoneme streams orbiting the orb on 3D wave trajectories.
 * Features ultra-low opacity (0.12 - 0.28), spiritual technology aesthetic, and
 * subtle voice/reasoning wave response.
 */
export function createSutraOrbiters(): SutraOrbitersHandle {
  const group = new THREE.Group();
  group.rotation.x = 0.40; // Master tilt relative to viewer

  const configs: SutraConfig[] = [];

  MAHESHWAR_SUTRAS.forEach((sutra, idx) => {
    const paletteColor = SUTRA_COLOR_PALETTES[idx % SUTRA_COLOR_PALETTES.length];
    const texture = createSanskritTextTexture(sutra, paletteColor);

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.18, // Ethereal low opacity
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(28, 7.0, 1);

    const count = MAHESHWAR_SUTRAS.length;
    const baseAngle = (idx / count) * Math.PI * 2;

    configs.push({
      sprite,
      material,
      texture,
      radius: 42 + (idx % 3) * 6, // 3 distinct orbital planes (42, 48, 54)
      inclination: 0.25 + (idx % 4) * 0.16,
      phase: baseAngle,
      speedJitter: 0.85 + (idx % 5) * 0.10,
      yAmp: 6 + (idx % 3) * 3.0,
    });

    group.add(sprite);
  });

  const update: SutraOrbitersHandle['update'] = (t, theme, reactivity, isReasoning) => {
    // Reactivity: voice spectrum / listening increases drift speed (+25%)
    const speed = theme.sutraSpeed * (1.0 + reactivity * 0.8);
    const baseOpacity = theme.sutraOpacity * (1.0 + reactivity * 0.4);

    // Reasoning wave pulse
    const reasoningPulse = isReasoning ? Math.sin(t * 2.5) * 3.0 : 0;
    const reasoningShimmer = isReasoning ? 0.08 : 0;

    configs.forEach((cfg, idx) => {
      const angle = cfg.phase + t * speed * cfg.speedJitter;
      const r = cfg.radius + reasoningPulse;

      // 3D Procedural Lissajous Wave Trajectory
      cfg.sprite.position.x = Math.cos(angle) * r;
      cfg.sprite.position.z = Math.sin(angle) * r;
      cfg.sprite.position.y =
        Math.sin(angle * 2.2 + idx) * cfg.yAmp +
        Math.sin(t * 0.35 + idx) * 3.5 * cfg.inclination;

      // Non-uniform breathing fade envelope (0.12 - 0.28 range)
      const fade = Math.sin(t * 0.5 + idx * 0.8) * 0.25 + 0.75;
      cfg.material.opacity = Math.min(0.35, (baseOpacity + reasoningShimmer) * fade);
    });

    group.rotation.y = t * speed * 0.20;
  };

  const dispose = () => {
    configs.forEach((cfg) => {
      cfg.texture.dispose();
      cfg.material.dispose();
    });
  };

  return { group, update, dispose };
}
