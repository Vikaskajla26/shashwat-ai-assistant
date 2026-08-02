import * as THREE from 'three';
import type { MutableRefObject } from 'react';
import type { AssistantState } from '../types';
import { qualityEngine, qualityRef } from '../perf/useRenderQuality';
import { RenderPipeline } from '../renderer/RenderPipeline';
import { createPlasmaCore, PlasmaCoreHandle } from './PlasmaCore';
import { createEnergyParticles } from '../components/orb/EnergyParticles';
import { createHaloField } from '../components/orb/HaloField';
import { createSutraOrbiters } from '../components/orb/SutraOrbiters';
import { OrbPhysics } from '../components/orb/OrbPhysics';
import { OrbAudio } from '../components/orb/OrbAudio';
import { OrbState } from '../components/orb/OrbState';
import { LAYER_ORB_BLOOM } from '../renderer/Layers';

export interface OrbControllerOptions {
  container: HTMLDivElement;
  width: number;
  height: number;
  stateRef: MutableRefObject<AssistantState>;
  volumeRef: MutableRefObject<number>;
}

export class OrbController {
  public pipeline: RenderPipeline;

  private plasma: PlasmaCoreHandle;
  private particles: ReturnType<typeof createEnergyParticles>;
  private halo: ReturnType<typeof createHaloField>;
  private sutras: ReturnType<typeof createSutraOrbiters>;

  private physics: OrbPhysics;
  private orbState: OrbState;

  private animFrameId = 0;
  private lastT = performance.now();
  private options: OrbControllerOptions;

  constructor(options: OrbControllerOptions) {
    this.options = options;
    const profile = qualityRef.current;

    // Initialize RenderPipeline
    this.pipeline = new RenderPipeline(options.container, options.width, options.height, profile);
    const scene = this.pipeline.scene;

    // 1. Sutras (renderOrder = 1)
    this.sutras = createSutraOrbiters();
    this.sutras.group.renderOrder = 1;
    scene.add(this.sutras.group);

    // 2. Halo (renderOrder = 2)
    this.halo = createHaloField();
    this.halo.group.renderOrder = 2;
    this.halo.group.traverse((obj) => obj.layers.enable(LAYER_ORB_BLOOM));
    scene.add(this.halo.group);

    // 3. Plasma Core (renderOrder = 3..5)
    this.plasma = createPlasmaCore(profile.orbSubdivisions);
    scene.add(this.plasma.group);

    // 4. Energy Particles (renderOrder = 6)
    this.particles = createEnergyParticles(profile.orbParticleCount);
    this.particles.points.renderOrder = 6;
    this.particles.points.layers.enable(LAYER_ORB_BLOOM);
    scene.add(this.particles.points);

    // Subsystem Controllers
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

    // Deep idle 30 FPS optimization
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

    // Execute render pipeline
    this.pipeline.render(theme.bloomStrength, new THREE.Color(theme.bloomColor));

    this.animFrameId = requestAnimationFrame(this.animate);
  };

  public handleResize() {
    this.pipeline.handleResize();
  }

  public dispose() {
    cancelAnimationFrame(this.animFrameId);
    this.physics.detach();
    this.plasma.dispose();
    this.particles.dispose();
    this.halo.dispose();
    this.sutras.dispose();
    this.pipeline.dispose(this.options.container);
  }
}
