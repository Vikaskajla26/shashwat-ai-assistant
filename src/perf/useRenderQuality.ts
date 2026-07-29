import { useEffect, useState } from 'react';

/**
 * Adaptive render-quality engine.
 *
 * The spec demands cinematic effects that "gracefully reduce on lower-end
 * systems" while "aiming for high frame rates on modern hardware." This module
 * exposes a single global quality tier shared by every WebGL scene (orb +
 * background), detects it from the host, and adapts it at runtime via a rolling
 * FPS watchdog. `prefers-reduced-motion` forces the lowest, calmest tier.
 *
 * It is intentionally a module singleton (not React context): the 3D render
 * loops live outside React's render cycle and need to read `qualityRef.current`
 * every frame without re-rendering components. A React hook (`useRenderQuality`)
 * subscribes a component to tier changes for UI affordances.
 */

export type QualityTier = 'high' | 'medium' | 'low';

export interface QualityProfile {
  tier: QualityTier;
  /** Icosahedron subdivision for the plasma core. Higher = smoother blob. */
  orbSubdivisions: number;
  /** Particle count in the orb's energy ecosystem. */
  orbParticleCount: number;
  /** Background star/dust particle count. */
  backgroundParticleCount: number;
  /** Enable UnrealBloom postprocessing. */
  bloom: boolean;
  /** Enable the animated noise/nebula background plane. */
  noise: boolean;
  /** Enable mouse parallax on the background. */
  parallax: boolean;
  /** Device pixel ratio cap. */
  pixelRatioCap: number;
  /** Whether the runtime allows antialiasing on the WebGL renderer. */
  antialias: boolean;
}

export const QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  high: {
    tier: 'high',
    orbSubdivisions: 48,
    orbParticleCount: 900,
    backgroundParticleCount: 1200,
    bloom: true,
    noise: true,
    parallax: true,
    pixelRatioCap: 2,
    antialias: true,
  },
  medium: {
    tier: 'medium',
    orbSubdivisions: 32,
    orbParticleCount: 500,
    backgroundParticleCount: 700,
    bloom: true,
    noise: true,
    parallax: true,
    pixelRatioCap: 1.5,
    antialias: true,
  },
  low: {
    tier: 'low',
    orbSubdivisions: 16,
    orbParticleCount: 220,
    backgroundParticleCount: 320,
    bloom: false,
    noise: false,
    parallax: false,
    pixelRatioCap: 1,
    antialias: false,
  },
};

/* ----------------------------- tier detection ---------------------------- */

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function detectInitialTier(): QualityTier {
  if (prefersReducedMotion()) return 'low';

  const cores = navigator.hardwareConcurrency || 4;
  const dpr = window.devicePixelRatio || 1;
  const memory = (navigator as any).deviceMemory || 4;

  // Heuristic: integrated / low-power GPUs and modest machines start lower.
  let score = 0;
  if (cores >= 8) score += 2;
  else if (cores >= 4) score += 1;
  if (memory >= 8) score += 2;
  else if (memory >= 4) score += 1;
  if (dpr <= 1) score += 1; // low-DPR screens are cheaper to fill

  // Crude GPU hint from the WebGL renderer string (best-effort, non-blocking).
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ||
      canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        const renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)).toLowerCase();
        if (/(apple m|rtx|radeon rx|geforce gtx 1|quadro)/.test(renderer)) score += 2;
        else if (/(intel|llvmpipe|swiftshader|mali|adreno 5|adreno 4)/.test(renderer)) {
          score -= 1;
        }
      }
    }
  } catch {
    /* ignore — detection is best-effort */
  }

  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

/* --------------------------- module singleton ---------------------------- */

interface QualityState {
  tier: QualityTier;
  profile: QualityProfile;
}

class QualityEngine {
  private state: QualityState;
  private listeners = new Set<(s: QualityState) => void>();

  // FPS watchdog
  private frameTimes: number[] = [];
  private lastWatchdogTier: QualityTier;
  private lowFpsStreakStart: number | null = null;
  private highFpsStreakStart: number | null = null;

  constructor() {
    const tier = detectInitialTier();
    this.state = { tier, profile: QUALITY_PROFILES[tier] };
    this.lastWatchdogTier = tier;
  }

  get current(): QualityState {
    return this.state;
  }

  get tier(): QualityTier {
    return this.state.tier;
  }

  get profile(): QualityProfile {
    return this.state.profile;
  }

  subscribe(fn: (s: QualityState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private setTier(tier: QualityTier) {
    if (this.state.tier === tier) return;
    this.state = { tier, profile: QUALITY_PROFILES[tier] };
    this.lastWatchdogTier = tier;
    this.lowFpsStreakStart = null;
    this.highFpsStreakStart = null;
    this.listeners.forEach((fn) => fn(this.state));
  }

  /** Manually force a tier (e.g. user setting / reduced-motion change). */
  force(tier: QualityTier) {
    this.setTier(tier);
  }

  /**
   * Called by each WebGL render loop once per frame. Maintains a rolling FPS
   * window and auto-degrades / upgrades the tier to keep the experience smooth.
   * Designed to be cheap (array bounded to ~120 samples).
   */
  reportFrame(deltaMs: number) {
    if (prefersReducedMotion()) return; // never auto-change under reduced-motion
    const now = performance.now();
    this.frameTimes.push(deltaMs);
    if (this.frameTimes.length > 120) this.frameTimes.shift();

    // Only evaluate once we have enough samples.
    if (this.frameTimes.length < 60) return;

    // Evaluate roughly every second (120 frames at ~60fps).
    if (this.frameTimes.length % 60 !== 0) return;

    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const fps = 1000 / avg;

    // Sustained poor performance → step down a tier.
    if (fps < 45) {
      if (this.lowFpsStreakStart === null) this.lowFpsStreakStart = now;
      if (now - this.lowFpsStreakStart > 1500) {
        if (this.tier === 'high') this.setTier('medium');
        else if (this.tier === 'medium') this.setTier('low');
      }
    } else {
      this.lowFpsStreakStart = null;
    }

    // Sustained strong performance → cautiously step up.
    if (fps > 58) {
      if (this.highFpsStreakStart === null) this.highFpsStreakStart = now;
      // Require a longer recovery window before upgrading to avoid thrash.
      if (now - this.highFpsStreakStart > 6000) {
        if (this.tier === 'low') this.setTier('medium');
        else if (this.tier === 'medium') this.setTier('high');
      }
    } else {
      this.highFpsStreakStart = null;
    }
  }
}

export const qualityEngine = new QualityEngine();

/** A mutable ref the render loops read each frame (no React re-render needed). */
export const qualityRef = { current: qualityEngine.profile };

// Keep the ref in sync with engine changes.
qualityEngine.subscribe((s) => {
  qualityRef.current = s.profile;
});

/* --------------------------- reduced-motion sync ------------------------- */

if (typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const apply = () => {
    if (mq.matches) qualityEngine.force('low');
  };
  apply();
  mq.addEventListener?.('change', apply);
}

/* ------------------------------- React API ------------------------------- */

/** Subscribe a React component to the live quality tier. */
export function useRenderQuality(): QualityProfile {
  const [profile, setProfile] = useState<QualityProfile>(qualityEngine.profile);
  useEffect(() => {
    return qualityEngine.subscribe((s) => setProfile(s.profile));
  }, []);
  return profile;
}
