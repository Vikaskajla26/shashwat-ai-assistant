import * as THREE from 'three';

export interface BloomSettings {
  strength: number;
  radius: number;
  threshold: number;
}

export function createSceneLighting(scene: THREE.Scene) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0x63b8ff, 1.2);
  dirLight1.position.set(5, 5, 5);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xb36cff, 0.8);
  dirLight2.position.set(-5, -5, -2);
  scene.add(dirLight2);
}
