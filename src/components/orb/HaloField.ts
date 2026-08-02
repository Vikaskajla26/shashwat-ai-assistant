import * as THREE from 'three';
import { HALO_VERTEX, HALO_FRAGMENT } from './shaders';
import type { StateTheme } from '../../theme/aiState';

export interface HaloFieldHandle {
  group: THREE.Group;
  update: (t: number, audioBoost: number, theme: StateTheme) => void;
  dispose: () => void;
}

function makeShell(radius: number, color: string, opacity: number, power: number) {
  const geo = new THREE.SphereGeometry(radius, 48, 48);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: opacity },
      uTime: { value: 0 },
    },
    vertexShader: HALO_VERTEX,
    fragmentShader: HALO_FRAGMENT.replace(
      'pow(1.0 - abs(dot(vNormal, viewDir)), 3.0)',
      `pow(1.0 - abs(dot(vNormal, viewDir)), ${power.toFixed(1)})`
    ),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  });
  return new THREE.Mesh(geo, mat);
}

export function createHaloField(): HaloFieldHandle {
  const group = new THREE.Group();

  // Layer 5 — 3 Halo Shells (Radius 30 @ 0.15, Radius 36 @ 0.07, Radius 45 @ 0.03)
  const shell1 = makeShell(30, '#FEF08A', 0.15, 3.0);
  const shell2 = makeShell(36, '#F59E0B', 0.07, 2.5);
  const shell3 = makeShell(45, '#F97316', 0.03, 2.0);

  group.add(shell1);
  group.add(shell2);
  group.add(shell3);

  const col1 = new THREE.Color('#FEF08A');
  const col2 = new THREE.Color('#F59E0B');
  const col3 = new THREE.Color('#F97316');

  const update: HaloFieldHandle['update'] = (t, audioBoost, theme) => {
    col1.lerp(new THREE.Color(theme.fresnelColor), 0.05);
    col2.lerp(new THREE.Color(theme.bloomColor), 0.05);
    col3.lerp(new THREE.Color(theme.accentColor), 0.05);

    (shell1.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(col1);
    (shell2.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(col2);
    (shell3.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(col3);

    (shell1.material as THREE.ShaderMaterial).uniforms.uIntensity.value = 0.15 + audioBoost * 0.1;
    (shell2.material as THREE.ShaderMaterial).uniforms.uIntensity.value = 0.07 + audioBoost * 0.05;
    (shell3.material as THREE.ShaderMaterial).uniforms.uIntensity.value = 0.03 + audioBoost * 0.02;

    (shell1.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    (shell2.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    (shell3.material as THREE.ShaderMaterial).uniforms.uTime.value = t;

    // Independent rotations for multi-axial orbital depth
    shell1.rotation.y = t * 0.08;
    shell1.rotation.x = Math.sin(t * 0.05) * 0.1;

    shell2.rotation.y = -t * 0.05;
    shell2.rotation.z = Math.cos(t * 0.04) * 0.12;

    shell3.rotation.x = t * 0.03;
    shell3.rotation.y = t * 0.02;
  };

  const dispose = () => {
    [shell1, shell2, shell3].forEach((m) => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
  };

  return { group, update, dispose };
}
