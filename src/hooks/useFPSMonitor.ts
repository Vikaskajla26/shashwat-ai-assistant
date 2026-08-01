import { useQualityStore } from '../engine/state/useQualityStore';

export function useFPSMonitor() {
  const fps = useQualityStore((s) => s.fps);
  const frameTimeMs = useQualityStore((s) => s.frameTimeMs);
  const isLowPerformance = useQualityStore((s) => s.isLowPerformance);

  return { fps, frameTimeMs, isLowPerformance };
}
