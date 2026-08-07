import { useMemo } from 'react';

export interface GPUInfo {
  tier: 'low' | 'medium' | 'high';
  renderer: string;
  vendor: string;
}

export function useGPUConfig(): GPUInfo {
  return useMemo(
    () => ({
      tier: 'high',
      renderer: 'WebGL 2.0 (High Performance)',
      vendor: 'Standard GPU',
    }),
    []
  );
}
