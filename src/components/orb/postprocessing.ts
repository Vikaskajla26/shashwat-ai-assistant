import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { QualityProfile } from '../../perf/useRenderQuality';

/**
 * Dual-Pass Selective Bloom Composite Shader
 *
 *               Scene
 *                 │
 *     ┌───────────┴────────────┐
 *     │                        │
 * Beauty Pass             Bloom Pass (Layer 1)
 * (Full Scene Alpha)    (Bright Glow Target)
 *     │                        │
 *     └───────────┬────────────┘
 *                 │
 *        Final Composite Shader (HTML Canvas)
 */
const DualPassCompositeShader = {
  uniforms: {
    tBeauty: { value: null },
    tBloom: { value: null },
    uBloomColor: { value: new THREE.Color('#F59E0B') },
    uBloomIntensity: { value: 0.65 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tBeauty;
    uniform sampler2D tBloom;
    uniform vec3 uBloomColor;
    uniform float uBloomIntensity;
    varying vec2 vUv;

    void main() {
      vec4 beauty = texture2D(tBeauty, vUv);
      vec4 bloom = texture2D(tBloom, vUv);

      vec3 bloomRgb = clamp(bloom.rgb, 0.0, 1.0) * uBloomColor * uBloomIntensity;
      vec3 finalColor = clamp(beauty.rgb + bloomRgb, 0.0, 1.0);
      float finalAlpha = clamp(beauty.a + length(bloomRgb) * 0.4, 0.0, 1.0);

      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `,
};

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

  // 1. Beauty Pass Render Target — full scene color & alpha
  const beautyTarget = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
    stencilBuffer: false,
    depthBuffer: true,
  });

  // 2. Bloom Pass Composer — extracts Layer 1 bright areas into secondary buffer
  const bloomTarget = new THREE.WebGLRenderTarget(Math.floor(width / 2), Math.floor(height / 2), {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
    stencilBuffer: false,
    depthBuffer: true,
  });

  const bloomComposer = new EffectComposer(renderer, bloomTarget);
  bloomComposer.renderToScreen = false;

  const renderPass = new RenderPass(scene, camera);
  renderPass.clear = true;
  renderPass.clearDepth = true;
  renderPass.clearColor = new THREE.Color(0x000000);
  renderPass.clearAlpha = 0;
  bloomComposer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(Math.floor(width / 2), Math.floor(height / 2)),
    0.65, // strength
    0.22, // radius
    0.88  // threshold
  );
  bloomComposer.addPass(bloomPass);

  // 3. Final Composer — Composite output renderer
  const finalComposer = new EffectComposer(renderer);
  finalComposer.renderToScreen = true;

  const compositeMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(DualPassCompositeShader.uniforms),
    vertexShader: DualPassCompositeShader.vertexShader,
    fragmentShader: DualPassCompositeShader.fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });

  const compositeQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compositeMaterial);
  const compositeScene = new THREE.Scene();
  compositeScene.add(compositeQuad);
  const orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const render = () => {
    // Pass 1: Beauty Pass — Full Scene (Layers 0 & 1)
    camera.layers.enable(0);
    camera.layers.enable(1);
    renderer.setRenderTarget(beautyTarget);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);

    // Pass 2: Bloom Pass — Selective Layer 1 Only (Orb + Halo + Particles)
    camera.layers.set(1);
    bloomComposer.render();

    // Reset camera layers for general interaction
    camera.layers.enable(0);
    camera.layers.enable(1);

    // Pass 3: Composite Beauty Texture + Bloom Texture to HTML Canvas Screen
    compositeMaterial.uniforms.tBeauty.value = beautyTarget.texture;
    compositeMaterial.uniforms.tBloom.value = bloomComposer.renderTarget2.texture;

    renderer.setRenderTarget(null);
    renderer.clear(true, true, true);
    renderer.render(compositeScene, orthographicCamera);
  };

  const setSize = (w: number, h: number) => {
    beautyTarget.setSize(w, h);
    bloomTarget.setSize(Math.floor(w / 2), Math.floor(h / 2));
    bloomComposer.setSize(Math.floor(w / 2), Math.floor(h / 2));
    finalComposer.setSize(w, h);
    bloomPass.setSize(Math.floor(w / 2), Math.floor(h / 2));
  };

  const setBloom = (
    strength: number,
    radius: number,
    threshold: number,
    color: THREE.Color,
  ) => {
    bloomPass.strength = Math.min(0.9, Math.max(0, strength));
    bloomPass.radius = Math.min(0.45, Math.max(0, radius));
    bloomPass.threshold = Math.min(0.95, Math.max(0.75, threshold));
    compositeMaterial.uniforms.uBloomIntensity.value = bloomPass.strength;

    if (color && compositeMaterial.uniforms.uBloomColor) {
      (compositeMaterial.uniforms.uBloomColor.value as THREE.Color).copy(color);
    }
  };

  const dispose = () => {
    beautyTarget.dispose();
    bloomTarget.dispose();
    bloomComposer.dispose();
    finalComposer.dispose();
    compositeMaterial.dispose();
    compositeQuad.geometry.dispose();
  };

  return { composer: bloomComposer, bloomPass, enabled: true, render, setSize, setBloom, dispose };
}
