import * as THREE from 'three';
import { LAYER_SCENE, LAYER_ORB_BLOOM } from './Layers';

export class CameraController {
  public camera: THREE.PerspectiveCamera;

  constructor(fov: number, aspect: number, near: number, far: number, distance: number) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.z = distance;
    this.enableAllLayers();
  }

  public enableAllLayers() {
    this.camera.layers.enable(LAYER_SCENE);
    this.camera.layers.enable(LAYER_ORB_BLOOM);
  }

  public setBloomLayerOnly() {
    this.camera.layers.set(LAYER_ORB_BLOOM);
  }

  public updateAspect(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
