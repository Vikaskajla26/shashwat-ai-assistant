export type OrbStateType = 'idle' | 'listening' | 'thinking' | 'speaking' | 'success' | 'error';

export interface OrbStateParams {
  noiseFrequency: number;
  noiseAmplitude: number;
  rotationSpeed: number;
  bloomStrength: number;
  particleDensity: number;
  rimColor: string;
  coreColor: string;
}

export const ORB_STATE_PRESETS: Record<OrbStateType, OrbStateParams> = {
  idle: {
    noiseFrequency: 1.2,
    noiseAmplitude: 0.15,
    rotationSpeed: 0.2,
    bloomStrength: 0.4,
    particleDensity: 0.3,
    rimColor: '#A9FFFF',
    coreColor: '#63B8FF',
  },
  listening: {
    noiseFrequency: 1.8,
    noiseAmplitude: 0.22,
    rotationSpeed: 0.35,
    bloomStrength: 0.65,
    particleDensity: 0.5,
    rimColor: '#A9FFFF',
    coreColor: '#4FC3F7',
  },
  thinking: {
    noiseFrequency: 3.2,
    noiseAmplitude: 0.35,
    rotationSpeed: 0.8,
    bloomStrength: 0.85,
    particleDensity: 0.9,
    rimColor: '#B36CFF',
    coreColor: '#9B5DE5',
  },
  speaking: {
    noiseFrequency: 2.4,
    noiseAmplitude: 0.3,
    rotationSpeed: 0.5,
    bloomStrength: 0.75,
    particleDensity: 0.7,
    rimColor: '#A9FFFF',
    coreColor: '#FF4D9D',
  },
  success: {
    noiseFrequency: 2.0,
    noiseAmplitude: 0.4,
    rotationSpeed: 0.6,
    bloomStrength: 1.0,
    particleDensity: 1.0,
    rimColor: '#34D399',
    coreColor: '#059669',
  },
  error: {
    noiseFrequency: 1.0,
    noiseAmplitude: 0.1,
    rotationSpeed: 0.1,
    bloomStrength: 0.2,
    particleDensity: 0.2,
    rimColor: '#F87171',
    coreColor: '#DC2626',
  },
};

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
