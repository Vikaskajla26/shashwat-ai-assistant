import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { HDRComposer } from './HDRComposer';

export class BloomPipeline {
  public bloomTarget: THREE.WebGLRenderTarget;
  public bloomComposer: EffectComposer;
  public bloomPass: UnrealBloomPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, width: number, height: number) {
    const downW = Math.floor(width / 2);
    const downH = Math.floor(height / 2);

    this.bloomTarget = HDRComposer.createRenderTarget(downW, downH);
    this.bloomComposer = new EffectComposer(renderer, this.bloomTarget);
    this.bloomComposer.renderToScreen = false;

    const renderPass = new RenderPass(scene, camera);
    renderPass.clear = true;
    renderPass.clearDepth = true;
    renderPass.clearColor = new THREE.Color(0x000000);
    renderPass.clearAlpha = 0;
    this.bloomComposer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(downW, downH),
      0.65, // strength
      0.22, // radius
      0.88  // threshold
    );
    this.bloomComposer.addPass(this.bloomPass);
  }

  public setSize(w: number, h: number) {
    const downW = Math.floor(w / 2);
    const downH = Math.floor(h / 2);
    this.bloomTarget.setSize(downW, downH);
    this.bloomComposer.setSize(downW, downH);
    this.bloomPass.setSize(downW, downH);
  }

  public setBloom(strength: number, radius: number, threshold: number) {
    this.bloomPass.strength = Math.min(2.0, Math.max(0, strength));
    this.bloomPass.radius = Math.min(1.0, Math.max(0, radius));
    this.bloomPass.threshold = Math.min(1.0, Math.max(0.0, threshold));
  }

  public dispose() {
    this.bloomTarget.dispose();
    this.bloomComposer.dispose();
  }
}
