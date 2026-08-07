import { useState } from 'react';

export function useAdaptiveQuality() {
  const [quality] = useState({
    gpuTier: 'high' as const,
    profile: {
      dpr: 1.5,
      enablePostprocessing: true,
      enableShadows: true,
      particleMultiplier: 1.0,
    },
    dpr: 1.5,
    enablePostprocessing: true,
    enableShadows: true,
    particleMultiplier: 1.0,
  });

  return quality;
}
