import * as THREE from 'three';
import { HALO_VERTEX, HALO_FRAGMENT } from './shaders';
import type { StateTheme } from '../../theme/aiState';

/**
 * HaloField — soft additive halos wrapping the orb for volumetric glow and a
 * faked refraction/reflection sheen without an environment-map cost.
 *
 * Two nested shells: a tight inner halo (rim light) and a wider outer halo
 * (atmospheric diffusion). Both use fresnel-driven additive shaders so they
 * bloom naturally under the postprocessing pipeline.
 */

export interface HaloFieldHandle {
  group: THREE.Group;
  update: (t: number, audioBoost: number, theme: StateTheme) => void;
  dispose: () => void;
}

function makeShell(radius: number, color: string, intensity: number, power: number) {
  const geo = new THREE.SphereGeometry(radius, 48, 48);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uTime: { value: 0 },
    },
    vertexShader: HALO_VERTEX,
    fragmentShader: HALO_FRAGMENT
      .replace('pow(1.0 - abs(dot(vNormal, viewDir)), 3.0)',
        `pow(1.0 - abs(dot(vNormal, viewDir)), ${power.toFixed(1)})`),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  });
  return new THREE.Mesh(geo, mat);
}

export function createHaloField(): HaloFieldHandle {
  const group = new THREE.Group();

  const inner = makeShell(30, '#FEF08A', 1.0, 3.0);
  const outer = makeShell(40, '#F59E0B', 0.7, 2.2);
  group.add(inner);
  group.add(outer);

  const curInnerColor = new THREE.Color('#FEF08A');
  const curOuterColor = new THREE.Color('#F59E0B');

  const update: HaloFieldHandle['update'] = (t, audioBoost, theme) => {
    curInnerColor.lerp(new THREE.Color(theme.fresnelColor), 0.05);
    curOuterColor.lerp(new THREE.Color(theme.bloomColor), 0.05);
    (inner.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(curInnerColor);
    (outer.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(curOuterColor);

    const innerU = (inner.material as THREE.ShaderMaterial).uniforms;
    const outerU = (outer.material as THREE.ShaderMaterial).uniforms;
    innerU.uTime.value = t;
    outerU.uTime.value = t;
    innerU.uIntensity.value = 0.8 + audioBoost * 0.6;
    outerU.uIntensity.value = 0.6 * theme.motionIntensity + audioBoost * 0.3;

    group.rotation.y = t * 0.04;
  };

  const dispose = () => {
    [inner, outer].forEach((m) => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
  };

  return { group, update, dispose };
}
