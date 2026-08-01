import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { QualityProfile } from '../../perf/useRenderQuality';

export interface BloomHandle {
  composer: EffectComposer | null;
  bloomPass: UnrealBloomPass | null;
  enabled: boolean;
  render: () => void;
  setSize: (w: number, h: number) => void;
  setBloom: (strength: number, radius: number, threshold: number, color: THREE.Color) => void;
  dispose: () => void;
}

export function createBloomPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  width: number,
  height: number,
  quality: QualityProfile,
): BloomHandle {
  if (!quality.bloom) {
    const noop = () => {};
    return {
      composer: null,
      bloomPass: null,
      enabled: false,
      render: noop,
      setSize: noop,
      setBloom: noop,
      dispose: noop,
    };
  }

  // 1. Create transparent RGBA render target to prevent opaque black/blue screen clear quad
  const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
    stencilBuffer: false,
    depthBuffer: true,
  });

  const composer = new EffectComposer(renderer, renderTarget);

  // 2. RenderPass with 100% transparent clear alpha
  const renderPass = new RenderPass(scene, camera);
  renderPass.clearAlpha = 0;
  composer.addPass(renderPass);

  // 3. UnrealBloomPass configured for volumetric orb glow without clearing canvas to solid color
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    0.85, // strength
    0.5,  // radius
    0.25  // threshold
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  const render = () => composer.render();
  const setSize = (w: number, h: number) => {
    composer.setSize(w, h);
    bloomPass.setSize(w, h);
  };
  const setBloom = (
    strength: number,
    radius: number,
    threshold: number,
    color: THREE.Color,
  ) => {
    bloomPass.strength = strength;
    bloomPass.radius = radius;
    bloomPass.threshold = threshold;
    void color;
  };
  const dispose = () => {
    composer.dispose();
  };

  return { composer, bloomPass, enabled: true, render, setSize, setBloom, dispose };
}
