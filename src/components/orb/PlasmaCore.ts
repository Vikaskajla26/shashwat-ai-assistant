import * as THREE from 'three';
import { PLASMA_VERTEX_SHADER, PLASMA_FRAGMENT_SHADER } from './shaders';
import type { StateTheme } from '../../theme/aiState';

/**
 * PlasmaCore — the deforming volumetric blob at the heart of the orb.
 *
 * Layered: an outer noise-deformed membrane (the upgraded shader with fBm +
 * ripple + energy circulation) wraps a brighter inner plasma sphere for true
 * volumetric depth. Breathing, voice reactivity and the click ripple are all
 * driven here.
 */

export interface PlasmaCoreHandle {
  group: THREE.Group;
  update: (
    t: number,
    dt: number,
    audioBoost: number,
    theme: StateTheme,
    ripple: { strength: number; time: number; origin: THREE.Vector3 },
    mousePos?: { x: number; y: number },
    physics?: { vx: number; vy: number; microOscillation: number },
    spectrum?: { volumeNorm: number; bassNorm: number; midNorm: number; trebleNorm: number }
  ) => void;
  dispose: () => void;
}

export function createPlasmaCore(subdivisions: number): PlasmaCoreHandle {
  const group = new THREE.Group();

  // Outer membrane — MeshPhysicalMaterial glass test
  const membraneMat = new THREE.MeshPhysicalMaterial({
    color: 0x7c3aed,
    transmission: 0.9,
    thickness: 2,
    roughness: 0.1,
    metalness: 0,
    transparent: true,
    opacity: 0.9,
  });
  const membrane = new THREE.Mesh(membraneGeo, membraneMat);
  group.add(membrane);

  // 1. Inner Petal Core — 5-petal lotus flower energy core (Rose Pink / Magenta glow)
  const petalCoreGeo = new THREE.DodecahedronGeometry(11, 2);
  const petalCoreMat = new THREE.MeshBasicMaterial({
    color: 0xf43f5e,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    wireframe: false,
  });
  const petalCore = new THREE.Mesh(petalCoreGeo, petalCoreMat);
  group.add(petalCore);

  // 2. Central White Core Light Point
  const centerLightGeo = new THREE.SphereGeometry(5.5, 24, 24);
  const centerLightMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
  });
  const centerLight = new THREE.Mesh(centerLightGeo, centerLightMat);
  group.add(centerLight);

  // Cached target colors, smoothly lerped each frame for state transitions.
  const curBase = new THREE.Color('#F59E0B');
  const curAccent = new THREE.Color('#F97316');
  const curFresnel = new THREE.Color('#FEF08A');

  const update: PlasmaCoreHandle['update'] = (t, _dt, audioBoost, theme, ripple, mousePos, physics, spectrum) => {
    // Use FFT spectrum if available, otherwise fall back to audioBoost
    const bass = spectrum ? spectrum.bassNorm : audioBoost;
    const mid = spectrum ? spectrum.midNorm : audioBoost;
    const vol = spectrum ? spectrum.volumeNorm : audioBoost;
    const totalAudioBoost = Math.max(audioBoost, bass * 0.85);

    // Guard uniforms if using ShaderMaterial vs MeshPhysicalMaterial
    if ('uniforms' in membraneMat && (membraneMat as any).uniforms) {
      const u = (membraneMat as THREE.ShaderMaterial).uniforms;
      u.uTime.value = t;
      u.uAudioBoost.value = totalAudioBoost;
      u.uAmp.value = theme.orbAmp;
      u.uBreath.value = theme.orbBreath;
      u.uRippleStrength.value = ripple.strength;
      u.uRippleTime.value = ripple.time;
      u.uRippleOrigin.value.copy(ripple.origin);
      if (mousePos) {
        u.uMousePos.value.set(mousePos.x, mousePos.y);
      }
      if (physics) {
        u.uVelocity.value.set(physics.vx, physics.vy);
        u.uMicroOscillation.value = physics.microOscillation;
      }
      curBase.lerp(new THREE.Color(theme.baseColor), 0.05);
      curAccent.lerp(new THREE.Color(theme.accentColor), 0.05);
      curFresnel.lerp(new THREE.Color(theme.fresnelColor), 0.05);
      u.uBaseColor.value.copy(curBase);
      u.uAccentColor.value.copy(curAccent);
      u.uFresnelColor.value.copy(curFresnel);
    }

    const speedMultiplier = 1.0 + mid * 0.8;
    membrane.rotation.y = t * theme.orbSpeed * speedMultiplier;
    membrane.rotation.x = Math.sin(t * theme.orbSpeed * 0.7) * 0.15;

    // Inner petal lotus core counter-rotates and breathes
    petalCore.rotation.y = -t * theme.orbSpeed * 0.9 * speedMultiplier;
    petalCore.rotation.z = Math.sin(t * 0.8) * 0.2;
    const innerPulse = 1 + totalAudioBoost * 0.18 + Math.sin(t * theme.orbBreath * 1.6) * 0.03;
    petalCore.scale.setScalar(innerPulse);
    petalCoreMat.opacity = 0.75 + vol * 0.20;

    // Center white light point pulses with RMS volume
    centerLight.scale.setScalar(1 + totalAudioBoost * 0.25);
    centerLightMat.opacity = 0.9 + vol * 0.1;
  };

  const dispose = () => {
    membraneGeo.dispose();
    membraneMat.dispose();
    petalCoreGeo.dispose();
    petalCoreMat.dispose();
    centerLightGeo.dispose();
    centerLightMat.dispose();
  };

  return { group, update, dispose };
}
