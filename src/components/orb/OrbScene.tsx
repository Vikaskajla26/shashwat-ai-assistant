import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import * as THREE from 'three';
import type { AssistantState } from '../../types';
import type { StateTheme } from '../../theme/aiState';
import { getStateTheme } from '../../theme/aiState';
import { qualityEngine, qualityRef } from '../../perf/useRenderQuality';
import { createPlasmaCore } from './PlasmaCore';
import { createEnergyParticles } from './EnergyParticles';
import { createHaloField } from './HaloField';
import { createSutraOrbiters } from './SutraOrbiters';
import { createBloomPipeline, type BloomHandle } from './postprocessing';
import { OrbInteraction } from './interaction';

export interface OrbSceneProps {
  /** Live state, read via ref each frame (no scene rebuild on change). */
  stateRef: MutableRefObject<AssistantState>;
  /** Live audio volume 0..100, read via ref each frame. */
  volumeRef: MutableRefObject<number>;
  width?: number;
  height?: number;
}

/**
 * OrbScene — the living orb orchestrator.
 *
 * PERFORMANCE: mounts the entire WebGL scene exactly once (useEffect([])) and
 * reads live state/volume/theme through mutable refs every frame. This replaces
 * the previous pattern of rebuilding the whole scene on every state/volume
 * change (which tore down geometry, shaders and the GL context dozens of times
 * per second during audio). Layers are modular and individually disposable, so
 * StrictMode double-mount in dev is leak-free (forceContextLoss on teardown).
 */
export function OrbScene({ stateRef, volumeRef, width = 540, height = 540 }: OrbSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const profile = qualityRef.current;

    // 1. Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: profile.antialias,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.pixelRatioCap));
    container.appendChild(renderer.domElement);

    // 2. Scene + camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 110;

    // 3. Layers (modular). Subdivision + particle counts scale with quality.
    const plasma = createPlasmaCore(profile.orbSubdivisions);
    scene.add(plasma.group);

    const particles = createEnergyParticles(profile.orbParticleCount);
    scene.add(particles.points);

    const halo = createHaloField();
    scene.add(halo.group);

    const sutras = createSutraOrbiters();
    scene.add(sutras.group);

    // 4. Postprocessing (bloom) — null at low quality.
    const bloom: BloomHandle = createBloomPipeline(renderer, scene, camera, width, height, profile);

    // 5. Interaction controller
    const interaction = new OrbInteraction();
    interaction.attach();

    // 6. Animation loop — reads refs, never rebuilds the scene.
    let animFrameId = 0;
    let lastT = performance.now();

    // A single reusable theme object we update each frame from the live state.
    let theme: StateTheme = getStateTheme(stateRef.current);

    const animate = (time: number) => {
      const now = performance.now();
      const frameDelta = now - lastT;
      const dt = Math.min(0.05, frameDelta / 1000);
      lastT = now;
      const t = time * 0.001;

      // Report frame timing to the adaptive quality watchdog.
      qualityEngine.reportFrame(frameDelta);

      // Live reads — these change without remounting anything.
      const state = stateRef.current;
      theme = getStateTheme(state);

      const normVol = Math.min(1, volumeRef.current / 100);
      const isSpeaking = state === 'speaking';
      const isListening = state === 'listening';
      const isThinking =
        state === 'reasoning' || state === 'understanding' || state === 'searching';

      const audioBoost = isSpeaking
        ? 0.35 + normVol * 0.65
        : isListening
          ? 0.2 + normVol * 0.4
          : isThinking
            ? 0.3
            : 0.1;

      // Interaction spring + ripple.
      const ix = interaction.step(dt);

      // Apply mouse follow to all layers (parallax of the whole orb).
      const follow = 0.6;
      plasma.group.position.x = ix.x * follow;
      plasma.group.position.y = ix.y * follow;
      particles.points.position.x = ix.x * follow;
      particles.points.position.y = ix.y * follow;
      halo.group.position.x = ix.x * follow;
      halo.group.position.y = ix.y * follow;
      sutras.group.position.x = ix.x * follow;
      sutras.group.position.y = ix.y * follow;

      // Reactivity for sutras: bump during listening/reasoning.
      const sutraReactivity = isListening ? 0.8 : isThinking ? 1.0 : 0.2;

      plasma.update(t, dt, audioBoost, theme, ix.ripple);
      particles.update(t, audioBoost, theme);
      halo.update(t, audioBoost, theme);
      sutras.update(t, theme, sutraReactivity);

      // Drive bloom strength from the state theme (e.g. success flares).
      if (bloom.enabled) {
        bloom.setBloom(theme.bloomStrength, 0.6, 0.2, new THREE.Color(theme.bloomColor));
        bloom.render();
      } else {
        renderer.render(scene, camera);
      }

      animFrameId = requestAnimationFrame(animate);
    };

    animFrameId = requestAnimationFrame(animate);

    // 7. Resize handling (orb is fixed-size today, but keep it robust).
    const handleResize = () => {
      const p = qualityRef.current;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, p.pixelRatioCap));
    };
    window.addEventListener('resize', handleResize);

    // 8. Cleanup — full disposal, StrictMode-safe.
    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      interaction.detach();
      plasma.dispose();
      particles.dispose();
      halo.dispose();
      sutras.dispose();
      bloom.dispose();
      renderer.dispose();
      // Force-loss the GL context to guarantee no dev-mode leak under StrictMode.
      renderer.forceContextLoss();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center"
    />
  );
}
