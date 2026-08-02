import * as THREE from 'three';
import { ENERGY_PARTICLE_VERTEX, ENERGY_PARTICLE_FRAGMENT } from './shaders';
import type { StateTheme } from '../../theme/aiState';

/**
 * EnergyParticles — a dynamic particle ecosystem orbiting the plasma core.
 *
 * Particles spiral inward then outward (inner energy circulation), each on its
 * own phase-offset Lissajous-like path, with brightness and velocity driven by
 * the state's motion intensity and audio. Additive blending gives the luminous,
 * plasma-cloud look. Count scales with the quality tier.
 */

export interface EnergyParticlesHandle {
  points: THREE.Points;
  update: (t: number, audioBoost: number, theme: StateTheme, stateName?: string) => void;
  dispose: () => void;
}

export function createEnergyParticles(requestedCount: number): EnergyParticlesHandle {
  // Support 600-1500 tiny floating particles
  const count = Math.min(1500, Math.max(600, requestedCount || 1200));
  const geometry = new THREE.BufferGeometry();
  const seeds = new Float32Array(count);
  const radii = new Float32Array(count);
  const lifeSpeeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    seeds[i] = Math.random();
    radii[i] = 30 + Math.random() * 20; // radial shell around orb core
    lifeSpeeds[i] = 0.5 + Math.random() * 1.5;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
  geometry.setAttribute('aLifeSpeed', new THREE.BufferAttribute(lifeSpeeds, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAudioBoost: { value: 0 },
      uSpeed: { value: 0.6 },
      uIntensity: { value: 0.7 },
      uRepulsion: { value: 0.2 },
      uAttraction: { value: 0.5 },
      uColor: { value: new THREE.Color('#F59E0B') },
    },
    vertexShader: ENERGY_PARTICLE_VERTEX,
    fragmentShader: ENERGY_PARTICLE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  const curColor = new THREE.Color('#F59E0B');

  const update: EnergyParticlesHandle['update'] = (t, audioBoost, theme, stateName) => {
    const u = material.uniforms;
    u.uTime.value = t;
    u.uAudioBoost.value = audioBoost;
    u.uSpeed.value = theme.particleSpeed * 0.6;
    u.uIntensity.value = theme.particleBrightness;

    // React to AI State: Speaking/Reasoning boosts repulsion & outward energy trails
    const isSpeaking = stateName === 'speaking';
    const isReasoning = stateName === 'reasoning' || stateName === 'searching';

    u.uRepulsion.value = isSpeaking ? 1.0 : isReasoning ? 0.7 : 0.2;
    u.uAttraction.value = stateName === 'listening' ? 0.8 : 0.4;

    curColor.lerp(new THREE.Color(theme.bloomColor), 0.05);
    u.uColor.value.copy(curColor);

    points.rotation.y = t * theme.particleSpeed * 0.05;
  };

  const dispose = () => {
    geometry.dispose();
    material.dispose();
  };

  return { points, update, dispose };
}
