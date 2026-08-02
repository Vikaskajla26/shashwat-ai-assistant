import * as THREE from 'three';

export interface CoreLightHandle {
  petalCore: THREE.Mesh;
  centerLight: THREE.Mesh;
  update: (t: number, speed: number, breath: number, totalAudioBoost: number, vol: number) => void;
  dispose: () => void;
}

export function createCoreLight(): CoreLightHandle {
  // 1. Inner Petal Core — soft additive glow sphere (renderOrder = 4)
  // NOTE: MeshPhysicalMaterial with transmission:1 was removed because without an
  // environment map it bleeds the background bloom color (orange) through the glass,
  // making the entire orb appear as a solid orange circle.
  const petalCoreGeo = new THREE.SphereGeometry(12, 32, 32);
  const petalCoreMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#7C3AED'), // Deep violet inner glow
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide, // Render inside out for inner volume glow effect
  });
  const petalCore = new THREE.Mesh(petalCoreGeo, petalCoreMat);
  petalCore.renderOrder = 4;

  // 2. Central White Core Light Point (renderOrder = 5)
  const centerLightGeo = new THREE.SphereGeometry(5.5, 24, 24);
  const centerLightMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const centerLight = new THREE.Mesh(centerLightGeo, centerLightMat);
  centerLight.renderOrder = 5;

  const update = (t: number, speed: number, breath: number, totalAudioBoost: number, vol: number) => {
    const speedMultiplier = 1.0 + vol * 0.8;
    petalCore.rotation.y = -t * speed * 0.9 * speedMultiplier;
    petalCore.rotation.z = Math.sin(t * 0.8) * 0.2;
    const innerPulse = 1 + totalAudioBoost * 0.12 + Math.sin(t * breath * 1.6) * 0.03;
    petalCore.scale.setScalar(innerPulse);
    // Keep inner glow subtle — max 0.22 opacity to prevent orange bleed
    petalCoreMat.opacity = Math.min(0.22, 0.15 + vol * 0.07);

    centerLight.scale.setScalar(1 + totalAudioBoost * 0.20);
    centerLightMat.opacity = Math.min(0.65, 0.5 + vol * 0.15);
  };

  const dispose = () => {
    petalCoreGeo.dispose();
    petalCoreMat.dispose();
    centerLightGeo.dispose();
    centerLightMat.dispose();
  };

  return { petalCore, centerLight, update, dispose };
}
