import { useState } from 'react';

export function useFPSMonitor() {
  const [stats] = useState({
    fps: 60,
    frameTimeMs: 16.6,
    isLowPerformance: false,
  });

  return stats;
}
