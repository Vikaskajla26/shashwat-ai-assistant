import type { AssistantState } from '../types';

/**
 * StateTheme — the complete atmospheric descriptor for one AI state.
 *
 * Every cinematic layer (orb shader, particles, Maheshwar sutras, background,
 * HUD, dock, audio spectrum) reads from this single map, so changing a state's
 * entry transforms the entire interface in one place. This is the spine of the
 * "each state should affect orb / particles / lighting / background / HUD /
 * accent colors / motion intensity" requirement.
 */
export interface StateTheme {
  /** Primary orb body color (hex). */
  baseColor: string;
  /** Secondary orb color, mixed by displacement. */
  accentColor: string;
  /** Rim/fresnel glow color. */
  fresnelColor: string;
  /** UnrealBloom tint + strength multiplier source. */
  bloomColor: string;
  /** 0–1 — overall bloom strength for this state. */
  bloomStrength: number;
  /** Orb self-rotation speed multiplier. */
  orbSpeed: number;
  /** Surface deformation amplitude multiplier (fluid blob). */
  orbAmp: number;
  /** Breathing rate multiplier (0 = still). */
  orbBreath: number;
  /** Particle field drift speed multiplier. */
  particleSpeed: number;
  /** Particle brightness multiplier (0–1). */
  particleBrightness: number;
  /** Maheshwar sutra orbital speed multiplier. */
  sutraSpeed: number;
  /** Maheshwar sutra base opacity (0–1, kept low to avoid distraction). */
  sutraOpacity: number;
  /** HUD / chrome accent color (hex). */
  hudAccent: string;
  /** Short uppercase HUD label for the status pill. */
  hudLabel: string;
  /** 0–1 — global motion intensity. Drives background drift, easing, parallax. */
  motionIntensity: number;
}

/* ------------------------------------------------------------------ *
 *  The 13-state atmosphere map (+ legacy disconnected/connecting).
 *  Colors follow a warm-core palette (honey gold at rest) that shifts
 *  with intent: rose = listening, amber = speaking, indigo/violet =
 *  cognition (understanding/reasoning/searching), cyan = executing,
 *  emerald = success, rose-red = error, deep blue = sleeping.
 * ------------------------------------------------------------------ */
export const STATE_THEME: Record<AssistantState, StateTheme> = {
  booting: {
    baseColor: '#1E3A8A',
    accentColor: '#38BDF8',
    fresnelColor: '#BAE6FD',
    bloomColor: '#38BDF8',
    bloomStrength: 0.9,
    orbSpeed: 0.06,
    orbAmp: 0.5,
    orbBreath: 0.4,
    particleSpeed: 0.5,
    particleBrightness: 0.5,
    sutraSpeed: 0.08,
    sutraOpacity: 0.18,
    hudAccent: '#38BDF8',
    hudLabel: 'INITIALIZING',
    motionIntensity: 0.3,
  },
  idle: {
    baseColor: '#F59E0B',
    accentColor: '#F97316',
    fresnelColor: '#FEF08A',
    bloomColor: '#F59E0B',
    bloomStrength: 0.7,
    orbSpeed: 0.12,
    orbAmp: 0.55,
    orbBreath: 1.0,
    particleSpeed: 0.6,
    particleBrightness: 0.55,
    sutraSpeed: 0.12,
    sutraOpacity: 0.22,
    hudAccent: '#F59E0B',
    hudLabel: 'AWAKE',
    motionIntensity: 0.45,
  },
  wakeWord: {
    baseColor: '#A855F7',
    accentColor: '#C084FC',
    fresnelColor: '#F5D0FE',
    bloomColor: '#A855F7',
    bloomStrength: 1.0,
    orbSpeed: 0.22,
    orbAmp: 0.75,
    orbBreath: 1.6,
    particleSpeed: 1.0,
    particleBrightness: 0.7,
    sutraSpeed: 0.3,
    sutraOpacity: 0.32,
    hudAccent: '#C084FC',
    hudLabel: 'WAKING',
    motionIntensity: 0.7,
  },
  listening: {
    baseColor: '#F43F5E',
    accentColor: '#FB7185',
    fresnelColor: '#FECDD3',
    bloomColor: '#F43F5E',
    bloomStrength: 0.85,
    orbSpeed: 0.18,
    orbAmp: 0.7,
    orbBreath: 1.4,
    particleSpeed: 0.9,
    particleBrightness: 0.7,
    sutraSpeed: 0.25,
    sutraOpacity: 0.3,
    hudAccent: '#F43F5E',
    hudLabel: 'LISTENING',
    motionIntensity: 0.75,
  },
  understanding: {
    baseColor: '#6366F1',
    accentColor: '#818CF8',
    fresnelColor: '#C7D2FE',
    bloomColor: '#6366F1',
    bloomStrength: 0.8,
    orbSpeed: 0.2,
    orbAmp: 0.65,
    orbBreath: 1.1,
    particleSpeed: 0.8,
    particleBrightness: 0.6,
    sutraSpeed: 0.4,
    sutraOpacity: 0.34,
    hudAccent: '#818CF8',
    hudLabel: 'UNDERSTANDING',
    motionIntensity: 0.6,
  },
  reasoning: {
    baseColor: '#7C3AED',
    accentColor: '#A78BFA',
    fresnelColor: '#DDD6FE',
    bloomColor: '#7C3AED',
    bloomStrength: 0.9,
    orbSpeed: 0.26,
    orbAmp: 0.8,
    orbBreath: 1.0,
    particleSpeed: 0.85,
    particleBrightness: 0.62,
    sutraSpeed: 0.5,
    sutraOpacity: 0.4,
    hudAccent: '#A78BFA',
    hudLabel: 'REASONING',
    motionIntensity: 0.7,
  },
  searching: {
    baseColor: '#0EA5E9',
    accentColor: '#38BDF8',
    fresnelColor: '#BAE6FD',
    bloomColor: '#0EA5E9',
    bloomStrength: 0.95,
    orbSpeed: 0.34,
    orbAmp: 0.85,
    orbBreath: 1.2,
    particleSpeed: 1.1,
    particleBrightness: 0.66,
    sutraSpeed: 0.45,
    sutraOpacity: 0.34,
    hudAccent: '#38BDF8',
    hudLabel: 'SEARCHING',
    motionIntensity: 0.8,
  },
  executing: {
    baseColor: '#06B6D4',
    accentColor: '#22D3EE',
    fresnelColor: '#A5F3FC',
    bloomColor: '#06B6D4',
    bloomStrength: 0.95,
    orbSpeed: 0.3,
    orbAmp: 0.9,
    orbBreath: 1.3,
    particleSpeed: 1.2,
    particleBrightness: 0.7,
    sutraSpeed: 0.4,
    sutraOpacity: 0.32,
    hudAccent: '#22D3EE',
    hudLabel: 'EXECUTING',
    motionIntensity: 0.85,
  },
  speaking: {
    baseColor: '#F97316',
    accentColor: '#FBBF24',
    fresnelColor: '#FED7AA',
    bloomColor: '#F97316',
    bloomStrength: 1.0,
    orbSpeed: 0.24,
    orbAmp: 0.9,
    orbBreath: 1.7,
    particleSpeed: 1.0,
    particleBrightness: 0.72,
    sutraSpeed: 0.28,
    sutraOpacity: 0.3,
    hudAccent: '#FBBF24',
    hudLabel: 'SPEAKING',
    motionIntensity: 0.85,
  },
  learning: {
    baseColor: '#8B5CF6',
    accentColor: '#A78BFA',
    fresnelColor: '#E9D5FF',
    bloomColor: '#8B5CF6',
    bloomStrength: 0.85,
    orbSpeed: 0.16,
    orbAmp: 0.7,
    orbBreath: 1.0,
    particleSpeed: 0.7,
    particleBrightness: 0.6,
    sutraSpeed: 0.4,
    sutraOpacity: 0.4,
    hudAccent: '#A78BFA',
    hudLabel: 'LEARNING',
    motionIntensity: 0.6,
  },
  success: {
    baseColor: '#10B981',
    accentColor: '#34D399',
    fresnelColor: '#A7F3D0',
    bloomColor: '#10B981',
    bloomStrength: 1.1,
    orbSpeed: 0.2,
    orbAmp: 0.6,
    orbBreath: 1.2,
    particleSpeed: 0.9,
    particleBrightness: 0.75,
    sutraSpeed: 0.26,
    sutraOpacity: 0.32,
    hudAccent: '#34D399',
    hudLabel: 'COMPLETE',
    motionIntensity: 0.6,
  },
  error: {
    baseColor: '#DC2626',
    accentColor: '#F87171',
    fresnelColor: '#FECACA',
    bloomColor: '#DC2626',
    bloomStrength: 0.9,
    orbSpeed: 0.15,
    orbAmp: 0.7,
    orbBreath: 0.8,
    particleSpeed: 0.6,
    particleBrightness: 0.6,
    sutraSpeed: 0.18,
    sutraOpacity: 0.24,
    hudAccent: '#F87171',
    hudLabel: 'RECOVERING',
    motionIntensity: 0.5,
  },
  sleeping: {
    baseColor: '#1E40AF',
    accentColor: '#3B82F6',
    fresnelColor: '#93C5FD',
    bloomColor: '#1D4ED8',
    bloomStrength: 0.4,
    orbSpeed: 0.05,
    orbAmp: 0.3,
    orbBreath: 0.4,
    particleSpeed: 0.25,
    particleBrightness: 0.35,
    sutraSpeed: 0.06,
    sutraOpacity: 0.14,
    hudAccent: '#3B82F6',
    hudLabel: 'DREAMING',
    motionIntensity: 0.2,
  },
  // Legacy runtime states — mapped onto cinematic equivalents.
  disconnected: {
    baseColor: '#1E40AF',
    accentColor: '#3B82F6',
    fresnelColor: '#93C5FD',
    bloomColor: '#1D4ED8',
    bloomStrength: 0.45,
    orbSpeed: 0.06,
    orbAmp: 0.35,
    orbBreath: 0.45,
    particleSpeed: 0.3,
    particleBrightness: 0.4,
    sutraSpeed: 0.07,
    sutraOpacity: 0.16,
    hudAccent: '#3B82F6',
    hudLabel: 'STANDBY',
    motionIntensity: 0.22,
  },
  connecting: {
    baseColor: '#1E3A8A',
    accentColor: '#38BDF8',
    fresnelColor: '#BAE6FD',
    bloomColor: '#38BDF8',
    bloomStrength: 0.8,
    orbSpeed: 0.1,
    orbAmp: 0.55,
    orbBreath: 0.6,
    particleSpeed: 0.6,
    particleBrightness: 0.55,
    sutraSpeed: 0.1,
    sutraOpacity: 0.2,
    hudAccent: '#38BDF8',
    hudLabel: 'CONNECTING',
    motionIntensity: 0.35,
  },
};

/**
 * Normalize a raw runtime state into the state whose theme we should render.
 * Legacy WebSocket states collapse onto their cinematic siblings so the whole
 * app speaks one visual language.
 */
export function resolveThemeState(state: AssistantState): AssistantState {
  switch (state) {
    case 'disconnected':
      return 'sleeping';
    case 'connecting':
      return 'connecting';
    default:
      return state;
  }
}

export function getStateTheme(state: AssistantState): StateTheme {
  const resolved = resolveThemeState(state);
  return STATE_THEME[resolved] || STATE_THEME['sleeping'];
}
