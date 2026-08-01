import { useQualityStore } from '../engine/state/useQualityStore';

export function useAdaptiveQuality() {
  const gpuTier = useQualityStore((s) => s.gpuTier);
  const profile = useQualityStore((s) => s.profile);

  return {
    gpuTier,
    profile,
    dpr: profile.dpr,
    enablePostprocessing: profile.enablePostprocessing,
    enableShadows: profile.enableShadows,
    particleMultiplier: profile.particleMultiplier,
  };
}
