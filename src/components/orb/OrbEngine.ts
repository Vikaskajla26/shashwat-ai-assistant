import * as THREE from 'three';
import type { MutableRefObject } from 'react';
import type { AssistantState } from '../../types';
import { qualityEngine, qualityRef } from '../../perf/useRenderQuality';
import { createPlasmaCore, PlasmaCoreHandle } from './PlasmaCore';
import { createEnergyParticles } from './EnergyParticles';
import { createHaloField } from './HaloField';
import { createSutraOrbiters } from './SutraOrbiters';
import { createBloomPipeline, type BloomHandle } from './postprocessing';
import { OrbPhysics } from './OrbPhysics';
import { OrbAudio } from './OrbAudio';
import { OrbState } from './OrbState';

export interface OrbEngineOptions {
  container: HTMLDivElement;
  width: number;
  height: number;
  stateRef: MutableRefObject<AssistantState>;
  volumeRef: MutableRefObject<number>;
}

export class OrbEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private plasma: PlasmaCoreHandle;
  private particles: ReturnType<typeof createEnergyParticles>;
  private halo: ReturnType<typeof createHaloField>;
  private sutras: ReturnType<typeof createSutraOrbiters>;
  private bloom: BloomHandle;

  private physics: OrbPhysics;
  private orbState: OrbState;

  private animFrameId = 0;
  private lastT = performance.now();
  private options: OrbEngineOptions;

  constructor(options: OrbEngineOptions) {
    this.options = options;
    const profile = qualityRef.current;

    // 1. Renderer — filmic tone mapping & sRGB color space
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: profile.antialias,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
    });
    this.renderer.setSize(options.width, options.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.pixelRatioCap));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    (this.renderer as unknown as { useLegacyLights: boolean; physicallyCorrectLights: boolean }).useLegacyLights = false;
    (this.renderer as unknown as { useLegacyLights: boolean; physicallyCorrectLights: boolean }).physicallyCorrectLights = true;

    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.background = 'transparent';
    canvas.style.backgroundColor = 'transparent';
    canvas.style.border = 'none';
    canvas.style.outline = 'none';
    canvas.style.boxShadow = 'none';
    canvas.style.pointerEvents = 'none';

    options.container.appendChild(canvas);

    // 2. Scene + Camera + Lights
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, options.width / options.height, 0.1, 1000);
    this.camera.layers.enable(0);
    this.camera.layers.enable(1);
    this.camera.position.z = 110;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffeedd, 2.5);
    keyLight.position.set(60, 80, 80);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x8080ff, 1.2);
    rimLight.position.set(-80, -40, -60);
    this.scene.add(rimLight);

    // 3. Layers — explicit renderOrder hierarchy
    this.sutras = createSutraOrbiters();
    this.sutras.group.renderOrder = 1;
    this.scene.add(this.sutras.group);

    this.halo = createHaloField();
    this.halo.group.renderOrder = 2;
    this.halo.group.traverse((obj) => {
      obj.layers.enable(1);
    });
    this.scene.add(this.halo.group);

    this.plasma = createPlasmaCore(profile.orbSubdivisions);
    this.plasma.group.renderOrder = 3;
    this.plasma.group.traverse((obj) => {
      obj.layers.enable(1);
    });
    this.scene.add(this.plasma.group);

    this.particles = createEnergyParticles(profile.orbParticleCount);
    this.particles.points.renderOrder = 6;
    this.particles.points.layers.enable(1);
    this.scene.add(this.particles.points);

    // 4. Bloom Pipeline
    this.bloom = createBloomPipeline(this.renderer, this.scene, this.camera, options.width, options.height, profile);

    // 5. Physics & State
    this.physics = new OrbPhysics();
    this.physics.attach();

    this.orbState = new OrbState(options.stateRef.current);
  }

  public start() {
    this.animate(performance.now());
  }

  private animate = (time: number) => {
    const now = performance.now();
    const frameDelta = now - this.lastT;
    const dt = Math.min(0.05, frameDelta / 1000);
    this.lastT = now;
    const t = time * 0.001;

    qualityEngine.reportFrame(frameDelta);

    const ix = this.physics.step(dt, t);

    // Idle optimization — 30 FPS when idle
    const isUserIdle = ix.speed < 0.01 && this.options.volumeRef.current === 0;
    if (isUserIdle && dt < 0.032 && this.options.stateRef.current === 'idle') {
      this.animFrameId = requestAnimationFrame(this.animate);
      return;
    }

    const state = this.options.stateRef.current;
    const theme = this.orbState.update(state, dt);

    const audio = OrbAudio.getMetrics(state, this.options.volumeRef.current);

    // Parallax mouse follow
    const follow = 0.6;
    this.plasma.group.position.x = ix.x * follow;
    this.plasma.group.position.y = ix.y * follow;
    this.particles.points.position.x = ix.x * follow;
    this.particles.points.position.y = ix.y * follow;
    this.halo.group.position.x = ix.x * follow;
    this.halo.group.position.y = ix.y * follow;
    this.sutras.group.position.x = ix.x * follow;
    this.sutras.group.position.y = ix.y * follow;

    const isListening = state === 'listening';
    const isThinking = state === 'reasoning' || state === 'understanding' || state === 'searching';
    const sutraReactivity = isListening ? 0.8 : isThinking ? 1.0 : 0.2;

    this.plasma.update(
      t,
      dt,
      audio.audioBoost,
      theme,
      ix.ripple,
      { x: ix.normX, y: ix.normY },
      { vx: ix.vx, vy: ix.vy, microOscillation: ix.microOscillation },
      {
        volumeNorm: audio.volumeNorm,
        bassNorm: audio.bassNorm,
        midNorm: audio.midNorm,
        trebleNorm: audio.trebleNorm,
      }
    );

    this.particles.update(t, Math.max(audio.audioBoost, audio.trebleNorm), theme, state);
    this.halo.update(t, Math.max(audio.audioBoost, audio.volumeNorm), theme);
    this.sutras.update(t, theme, sutraReactivity, isThinking);

    if (this.bloom.enabled) {
      this.bloom.setBloom(theme.bloomStrength * 0.65, 0.22, 0.88, new THREE.Color(theme.bloomColor));
      this.bloom.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    this.animFrameId = requestAnimationFrame(this.animate);
  };

  public handleResize() {
    const profile = qualityRef.current;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.pixelRatioCap));
  }

  public dispose() {
    cancelAnimationFrame(this.animFrameId);
    this.physics.detach();
    this.plasma.dispose();
    this.particles.dispose();
    this.halo.dispose();
    this.sutras.dispose();
    this.bloom.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();

    if (this.options.container.contains(this.renderer.domElement)) {
      this.options.container.removeChild(this.renderer.domElement);
    }
  }
}
