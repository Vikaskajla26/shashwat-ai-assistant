import * as THREE from 'three';

export interface CoreLightHandle {
  petalCore: THREE.Mesh;
  centerLight: THREE.Mesh;
  update: (t: number, speed: number, breath: number, totalAudioBoost: number, vol: number) => void;
  dispose: () => void;
}

export function createCoreLight(): CoreLightHandle {
  // 1. Inner Petal Core — Glass Physical Material (renderOrder = 4)
  const petalCoreGeo = new THREE.DodecahedronGeometry(11, 2);
  const petalCoreMat = new THREE.MeshPhysicalMaterial({
    color: 0xf43f5e,
    transmission: 1.0,
    thickness: 3.0,
    roughness: 0.0,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    transparent: true,
    opacity: 0.9,
    ior: 1.5,
  });
  const petalCore = new THREE.Mesh(petalCoreGeo, petalCoreMat);
  petalCore.renderOrder = 4;

  // 2. Central White Core Light Point (renderOrder = 5)
  const centerLightGeo = new THREE.SphereGeometry(5.5, 24, 24);
  const centerLightMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
  });
  const centerLight = new THREE.Mesh(centerLightGeo, centerLightMat);
  centerLight.renderOrder = 5;

  const update = (t: number, speed: number, breath: number, totalAudioBoost: number, vol: number) => {
    const speedMultiplier = 1.0 + vol * 0.8;
    petalCore.rotation.y = -t * speed * 0.9 * speedMultiplier;
    petalCore.rotation.z = Math.sin(t * 0.8) * 0.2;
    const innerPulse = 1 + totalAudioBoost * 0.18 + Math.sin(t * breath * 1.6) * 0.03;
    petalCore.scale.setScalar(innerPulse);
    petalCoreMat.opacity = 0.75 + vol * 0.20;

    centerLight.scale.setScalar(1 + totalAudioBoost * 0.25);
    centerLightMat.opacity = 0.9 + vol * 0.1;
  };

  const dispose = () => {
    petalCoreGeo.dispose();
    petalCoreMat.dispose();
    centerLightGeo.dispose();
    centerLightMat.dispose();
  };

  return { petalCore, centerLight, update, dispose };
}
