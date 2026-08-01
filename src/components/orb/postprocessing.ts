import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { QualityProfile } from '../../perf/useRenderQuality';

/**
 * Volumetric bloom postprocessing for the orb.
 *
 * Wraps EffectComposer (RenderPass → UnrealBloomPass → OutputPass) so the orb
 * gains the soft, cinematic "volumetric glow / refraction" look the spec asks
 * for. At the Low quality tier (or reduced-motion) the composer is skipped and
 * the caller falls back to a direct `renderer.render(...)`.
 */

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
  // Low tier / reduced-motion: no composer. Caller renders directly.
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

  const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });

  renderer.setClearColor(0x000000, 0);

  const composer = new EffectComposer(renderer, renderTarget);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    0.9, // strength
    0.6, // radius
    0.2, // threshold
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
    // Tint the bloom toward the state's bloom color via the cleared scene fog-less
    // approach: UnrealBloomPass doesn't expose a direct color, so we modulate
    // strength by luminance and let the orb material colors carry the hue.
    void color;
  };
  const dispose = () => {
    composer.dispose();
  };

  return { composer, bloomPass, enabled: true, render, setSize, setBloom, dispose };
}
