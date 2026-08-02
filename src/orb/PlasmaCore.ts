import * as THREE from 'three';
import { createPlasmaMaterial } from '../components/orb/shaders';
import type { StateTheme } from '../theme/aiState';
import { createCoreLight, CoreLightHandle } from './CoreLight';
import { LAYER_ORB_BLOOM } from '../renderer/Layers';

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

  // Outer membrane — IcosahedronGeometry(30, 7) gives 65340 vertices, perfect for smooth deformation.
  // Cap at 7 — higher values (48, 32) are invalid for IcosahedronGeometry and cause GPU stalls.
  const detailLevel = Math.min(7, Math.max(3, subdivisions || 7));
  const membraneGeo = new THREE.IcosahedronGeometry(30, detailLevel);
  const membraneMat = createPlasmaMaterial();
  const membrane = new THREE.Mesh(membraneGeo, membraneMat);
  membrane.renderOrder = 3;
  group.add(membrane);

  console.log('[PlasmaCore] Vertex count:', membraneGeo.attributes.position.count, '| Detail level:', detailLevel);
  const initialBox = new THREE.Box3().setFromObject(group);
  console.log('[PlasmaCore] Bounds — Min:', initialBox.min.toArray().map(v=>v.toFixed(1)), 'Max:', initialBox.max.toArray().map(v=>v.toFixed(1)));

  // Inner lotus core & central light point
  const coreLight: CoreLightHandle = createCoreLight();
  group.add(coreLight.petalCore);
  group.add(coreLight.centerLight);

  // Enable Layer 1 on group
  group.traverse((obj) => {
    obj.layers.enable(LAYER_ORB_BLOOM);
  });

  const curBase = new THREE.Color('#F59E0B');
  const curAccent = new THREE.Color('#F97316');
  const curFresnel = new THREE.Color('#FEF08A');

  const update: PlasmaCoreHandle['update'] = (t, _dt, audioBoost, theme, ripple, mousePos, physics, spectrum) => {
    const bass = spectrum ? spectrum.bassNorm : audioBoost;
    const mid = spectrum ? spectrum.midNorm : audioBoost;
    const vol = spectrum ? spectrum.volumeNorm : audioBoost;

    const totalAudioBoost = Math.max(audioBoost, bass * 0.85);

    if ((membraneMat as THREE.ShaderMaterial).uniforms) {
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

    // Idle 4-second breathing scale cycle: 1.00 -> 1.04 -> 1.00 plus organic slow wobble
    const breathCycle = Math.sin(t * (Math.PI * 2.0 / 4.0));
    const idleScale = 1.00 + (breathCycle * 0.5 + 0.5) * 0.04;
    const wobbleX = Math.sin(t * 0.8) * 0.015;
    const wobbleY = Math.cos(t * 0.6) * 0.015;

    membrane.scale.set(idleScale + wobbleX, idleScale + wobbleY, idleScale);
    membrane.rotation.y = t * theme.orbSpeed * speedMultiplier;
    membrane.rotation.x = Math.sin(t * theme.orbSpeed * 0.7) * 0.15;

    coreLight.update(t, theme.orbSpeed, theme.orbBreath, totalAudioBoost, vol);
  };

  const dispose = () => {
    membraneGeo.dispose();
    membraneMat.dispose();
    coreLight.dispose();
  };

  return { group, update, dispose };
}
