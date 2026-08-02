import * as THREE from 'three';

export class EngineEnvironment {
  public ambientLight: THREE.AmbientLight;
  public keyLight: THREE.DirectionalLight;
  public rimLight: THREE.DirectionalLight;

  constructor(scene: THREE.Scene) {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xffeedd, 2.5);
    this.keyLight.position.set(60, 80, 80);
    scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x8080ff, 1.2);
    this.rimLight.position.set(-80, -40, -60);
    scene.add(this.rimLight);
  }

  public dispose(scene: THREE.Scene) {
    scene.remove(this.ambientLight);
    scene.remove(this.keyLight);
    scene.remove(this.rimLight);
  }
}
