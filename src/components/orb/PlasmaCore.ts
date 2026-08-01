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
    physics?: { vx: number; vy: number; microOscillation: number }
  ) => void;
  dispose: () => void;
}

export function createPlasmaCore(subdivisions: number): PlasmaCoreHandle {
  const group = new THREE.Group();

  // Outer membrane — high-subdivision icosahedron driven by the plasma shader.
  const membraneGeo = new THREE.IcosahedronGeometry(26, subdivisions);
  const membraneMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAudioBoost: { value: 0 },
      uAmp: { value: 0.55 },
      uBreath: { value: 1 },
      uRippleStrength: { value: 0 },
      uRippleTime: { value: 0 },
      uRippleOrigin: { value: new THREE.Vector3(0, 0, 1) },
      uMousePos: { value: new THREE.Vector2(0, 0) },
      uVelocity: { value: new THREE.Vector2(0, 0) },
      uMicroOscillation: { value: 0 },
      uBaseColor: { value: new THREE.Color('#F59E0B') },
      uAccentColor: { value: new THREE.Color('#F97316') },
      uFresnelColor: { value: new THREE.Color('#FEF08A') },
    },
    vertexShader: PLASMA_VERTEX_SHADER,
    fragmentShader: PLASMA_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: true,
  });
  const membrane = new THREE.Mesh(membraneGeo, membraneMat);
  group.add(membrane);

  // Inner plasma sphere — brighter, smaller, gives the orb a luminous core.
  const innerGeo = new THREE.SphereGeometry(12, 32, 32);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
  });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  group.add(inner);

  // Cached target colors, smoothly lerped each frame for state transitions.
  const curBase = new THREE.Color('#F59E0B');
  const curAccent = new THREE.Color('#F97316');
  const curFresnel = new THREE.Color('#FEF08A');

  const update: PlasmaCoreHandle['update'] = (t, _dt, audioBoost, theme, ripple, mousePos, physics) => {
    const u = membraneMat.uniforms;
    u.uTime.value = t;
    u.uAudioBoost.value = audioBoost;
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

    membrane.rotation.y = t * theme.orbSpeed;
    membrane.rotation.x = Math.sin(t * theme.orbSpeed * 0.7) * 0.15;

    // Inner core gently counter-rotates and pulses with audio.
    inner.rotation.y = -t * theme.orbSpeed * 0.5;
    const innerPulse = 1 + audioBoost * 0.12 + Math.sin(t * theme.orbBreath * 1.6) * 0.02;
    inner.scale.setScalar(innerPulse);
    innerMat.opacity = 0.8 + audioBoost * 0.15;
  };

  const dispose = () => {
    membraneGeo.dispose();
    membraneMat.dispose();
    innerGeo.dispose();
    innerMat.dispose();
  };

  return { group, update, dispose };
}
