import * as THREE from 'three';
import type { QualityProfile } from '../perf/useRenderQuality';
import { EngineRenderer } from './Renderer';
import { CameraController } from './CameraController';
import { EngineEnvironment } from './Environment';
import { HDRComposer } from './HDRComposer';
import { BloomPipeline } from './BloomPipeline';
import { PostFXComposite } from './PostFX';

export class RenderPipeline {
  public engineRenderer: EngineRenderer;
  public cameraController: CameraController;
  public environment: EngineEnvironment;
  public scene: THREE.Scene;

  public beautyTarget: THREE.WebGLRenderTarget;
  public bloomPipeline: BloomPipeline | null = null;
  public postFX: PostFXComposite | null = null;
  public enabledBloom = true;

  constructor(container: HTMLDivElement, width: number, height: number, quality: QualityProfile) {
    this.engineRenderer = new EngineRenderer(container, width, height);
    this.scene = new THREE.Scene();
    this.cameraController = new CameraController(55, width / height, 0.1, 1000, 75);
    this.environment = new EngineEnvironment(this.scene);

    this.beautyTarget = HDRComposer.createRenderTarget(width, height);

    if (quality.bloom) {
      this.bloomPipeline = new BloomPipeline(
        this.engineRenderer.renderer,
        this.scene,
        this.cameraController.camera,
        width,
        height
      );
      this.postFX = new PostFXComposite();
      this.enabledBloom = true;
    } else {
      this.enabledBloom = false;
    }
  }

  public render(bloomStrength: number, bloomColor: THREE.Color) {
    const renderer = this.engineRenderer.renderer;
    const camera = this.cameraController.camera;

    if (this.enabledBloom && this.bloomPipeline && this.postFX) {
      // Layer 6: Apple Vision Pro Cinematic Bloom (strength: 1.4, radius: 0.75, threshold: 0.05)
      this.bloomPipeline.setBloom(bloomStrength * 1.4, 0.75, 0.05);
      this.postFX.setBloomUniforms(this.bloomPipeline.bloomPass.strength, bloomColor);

      // Pass 1: Beauty Scene Pass (Layers 0 & 1)
      this.cameraController.enableAllLayers();
      renderer.setRenderTarget(this.beautyTarget);
      renderer.clear(true, true, true);
      renderer.render(this.scene, camera);

      // Pass 2: Selective Layer 1 Bloom Pass
      this.cameraController.setBloomLayerOnly();
      this.bloomPipeline.bloomComposer.render();

      // Reset camera layers for next frame
      this.cameraController.enableAllLayers();

      // Pass 3: Final Composite to HTML Canvas
      this.postFX.material.uniforms.tBeauty.value = this.beautyTarget.texture;
      this.postFX.material.uniforms.tBloom.value = this.bloomPipeline.bloomComposer.renderTarget2.texture;

      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.render(this.postFX.scene, this.postFX.camera);
    } else {
      renderer.setRenderTarget(null);
      renderer.render(this.scene, camera);
    }
  }

  public setSize(w: number, h: number) {
    this.engineRenderer.renderer.setSize(w, h);
    this.cameraController.updateAspect(w / h);
    this.beautyTarget.setSize(w, h);
    if (this.bloomPipeline) {
      this.bloomPipeline.setSize(w, h);
    }
  }

  public handleResize() {
    this.engineRenderer.handleResize();
  }

  public dispose(container: HTMLDivElement) {
    this.environment.dispose(this.scene);
    this.beautyTarget.dispose();
    if (this.bloomPipeline) this.bloomPipeline.dispose();
    if (this.postFX) this.postFX.dispose();
    this.engineRenderer.dispose(container);
  }
}
