/**
 * Orb Visual States & Color Palette Configuration.
 * Maps 13-state FSM states to bioluminescent colors, pulse frequencies, deformation, and motion parameters.
 */

import { AssistantState } from '../../types';

export interface OrbStateConfig {
  name: string;
  baseColor: string;
  accentColor: string;
  fresnelColor: string;
  glowColor: string;
  particleColor: string;
  breathSpeed: number; // Idle breathing frequency
  rotationSpeed: number; // Ring rotation speed
  deformationAmp: number; // Voice / Plasma deformation amplitude
  particleSpeed: number; // Particle orbit speed
  particleCount: number;
  pulseIntensity: number; // Ripple pulse intensity
  description: string;
}

export const ORB_STATE_CONFIGS: Record<string, OrbStateConfig> = {
  idle: {
    name: 'Idle',
    baseColor: '#1E3A8A', // Deep Ocean Blue
    accentColor: '#3B82F6', // Neon Azure
    fresnelColor: '#93C5FD', // Sky Cyan
    glowColor: '#1E40AF',
    particleColor: '#60A5FA',
    breathSpeed: 1.0,
    rotationSpeed: 0.12,
    deformationAmp: 0.1,
    particleSpeed: 0.8,
    particleCount: 40,
    pulseIntensity: 0.2,
    description: 'Blue breathing',
  },
  wakeWord: {
    name: 'Wake Word',
    baseColor: '#4C1D95', // Deep Royal Violet
    accentColor: '#8B5CF6', // Vivid Purple
    fresnelColor: '#C4B5FD', // Light Lavender
    glowColor: '#6D28D9',
    particleColor: '#A78BFA',
    breathSpeed: 3.5,
    rotationSpeed: 0.45,
    deformationAmp: 0.45,
    particleSpeed: 2.5,
    particleCount: 65,
    pulseIntensity: 1.0,
    description: 'Ripple pulse',
  },
  listening: {
    name: 'Listening',
    baseColor: '#065F46', // Emerald Forest
    accentColor: '#10B981', // Electric Emerald
    fresnelColor: '#6EE7B7', // Mint Glow
    glowColor: '#047857',
    particleColor: '#34D399',
    breathSpeed: 2.0,
    rotationSpeed: 0.25,
    deformationAmp: 0.6,
    particleSpeed: 1.5,
    particleCount: 50,
    pulseIntensity: 0.6,
    description: 'Audio-reactive expansion',
  },
  thinking: {
    name: 'Thinking',
    baseColor: '#581C87', // Deep Indigo
    accentColor: '#A855F7', // Magenta Purple
    fresnelColor: '#E9D5FF', // Soft Violet
    glowColor: '#7E22CE',
    particleColor: '#C084FC',
    breathSpeed: 2.8,
    rotationSpeed: 0.6,
    deformationAmp: 0.35,
    particleSpeed: 3.0,
    particleCount: 60,
    pulseIntensity: 0.5,
    description: 'Internal plasma circulation',
  },
  searching: {
    name: 'Searching',
    baseColor: '#0369A1', // Deep Cyan
    accentColor: '#06B6D4', // Bright Teal
    fresnelColor: '#A5F3FC', // Icy Blue
    glowColor: '#0891B2',
    particleColor: '#22D3EE',
    breathSpeed: 2.2,
    rotationSpeed: 0.8,
    deformationAmp: 0.25,
    particleSpeed: 4.0,
    particleCount: 75,
    pulseIntensity: 0.7,
    description: 'Orbiting particles',
  },
  executing: {
    name: 'Executing',
    baseColor: '#9A3412', // Burnt Amber
    accentColor: '#F97316', // Neon Orange
    fresnelColor: '#FFEDD5', // Golden Cream
    glowColor: '#EA580C',
    particleColor: '#FB923C',
    breathSpeed: 3.2,
    rotationSpeed: 0.9,
    deformationAmp: 0.5,
    particleSpeed: 4.5,
    particleCount: 70,
    pulseIntensity: 0.85,
    description: 'Fast energy flow',
  },
  speaking: {
    name: 'Speaking',
    baseColor: '#6D28D9', // Vivid Violet
    accentColor: '#EC4899', // Electric Pink
    fresnelColor: '#FBCFE8', // Rose Fresnel
    glowColor: '#BE185D',
    particleColor: '#F472B6',
    breathSpeed: 2.5,
    rotationSpeed: 0.35,
    deformationAmp: 1.0,
    particleSpeed: 2.0,
    particleCount: 55,
    pulseIntensity: 0.75,
    description: 'Voice-driven deformation',
  },
  learning: {
    name: 'Learning',
    baseColor: '#854D0E', // Deep Bronze
    accentColor: '#EAB308', // Solar Gold
    fresnelColor: '#FEF08A', // Pale Gold
    glowColor: '#CA8A04',
    particleColor: '#FACC15',
    breathSpeed: 1.8,
    rotationSpeed: 0.3,
    deformationAmp: 0.3,
    particleSpeed: 1.8,
    particleCount: 65,
    pulseIntensity: 0.9,
    description: 'Golden neural pulses',
  },
  sleeping: {
    name: 'Sleeping',
    baseColor: '#0F172A', // Midnight Slate
    accentColor: '#334155', // Dim Steel
    fresnelColor: '#64748B', // Cool Ash
    glowColor: '#1E293B',
    particleColor: '#475569',
    breathSpeed: 0.5,
    rotationSpeed: 0.05,
    deformationAmp: 0.05,
    particleSpeed: 0.3,
    particleCount: 20,
    pulseIntensity: 0.1,
    description: 'Slow breathing',
  },
};

export function getOrbStateConfig(state?: AssistantState): OrbStateConfig {
  if (!state) return ORB_STATE_CONFIGS.idle;
  const key = String(state).toLowerCase();
  if (key === 'wakeword' || key === 'wake') return ORB_STATE_CONFIGS.wakeWord;
  if (key === 'reasoning' || key === 'understanding') return ORB_STATE_CONFIGS.thinking;
  return ORB_STATE_CONFIGS[key] || ORB_STATE_CONFIGS.idle;
}
