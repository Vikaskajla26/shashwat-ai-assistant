import { useMemo } from 'react';
import { GPUDetector, GPUInfo } from '../engine/rendering/GPUDetector';

export function useGPUConfig(): GPUInfo {
  return useMemo(() => GPUDetector.getInstance().detect(), []);
}
