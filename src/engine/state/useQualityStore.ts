import { create } from 'zustand';
import { GPUTier } from '../rendering/GPUDetector';
import { QualityProfile } from '../rendering/AdaptiveQualityEngine';

export interface QualityStore {
  gpuTier: GPUTier;
  fps: number;
  frameTimeMs: number;
  isLowPerformance: boolean;
  profile: QualityProfile;

  // Actions
  setGPUTier: (tier: GPUTier) => void;
  setFPSMetrics: (fps: number, frameTimeMs: number, isLow: boolean) => void;
  setProfile: (profile: QualityProfile) => void;
}

export const useQualityStore = create<QualityStore>((set) => ({
  gpuTier: 'tier-2-high',
  fps: 60,
  frameTimeMs: 16.6,
  isLowPerformance: false,
  profile: {
    dpr: 1.5,
    enablePostprocessing: true,
    enableShadows: true,
    shadowMapSize: 1024,
    particleMultiplier: 0.8,
    bloomIntensity: 0.9,
    resolutionScale: 1.0,
  },

  setGPUTier: (tier) => set({ gpuTier: tier }),
  setFPSMetrics: (fps, frameTimeMs, isLow) => set({ fps, frameTimeMs, isLowPerformance: isLow }),
  setProfile: (profile) => set({ profile }),
}));
