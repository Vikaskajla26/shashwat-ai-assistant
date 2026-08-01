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

/**
 * Check if the current WebGL context supports floating point color buffers
 * required for smooth UnrealBloomPass postprocessing blur passes.
 */
function checkFloatTextureSupport(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    if (renderer.capabilities.isWebGL2) {
      return !!gl.getExtension('EXT_color_buffer_float');
    } else {
      return (
        !!gl.getExtension('OES_texture_half_float') &&
        !!gl.getExtension('OES_texture_half_float_linear')
      );
    }
  } catch {
    return false;
  }
}

export function createBloomPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  width: number,
  height: number,
  quality: QualityProfile,
): BloomHandle {
  const disabledHandle: BloomHandle = {
    composer: null,
    bloomPass: null,
    enabled: false,
    render: () => {},
    setSize: () => {},
    setBloom: () => {},
    dispose: () => {},
  };

  // Low tier, reduced-motion, or float texture unsupported: skip bloom.
  if (!quality.bloom || !checkFloatTextureSupport(renderer)) {
    return disabledHandle;
  }

  try {
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
      void color;
    };
    const dispose = () => {
      composer.dispose();
      renderTarget.dispose();
    };

    return { composer, bloomPass, enabled: true, render, setSize, setBloom, dispose };
  } catch (err) {
    console.warn('Bloom pipeline creation failed, falling back to direct render:', err);
    return disabledHandle;
  }
}
