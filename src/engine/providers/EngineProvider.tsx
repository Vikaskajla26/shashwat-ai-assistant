import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { GPUDetector, GPUInfo } from '../rendering/GPUDetector';
import { FPSMonitor, FPSMetrics } from '../rendering/FPSMonitor';
import { AdaptiveQualityEngine, QualityProfile } from '../rendering/AdaptiveQualityEngine';
import { ViewportEngine, ViewportState } from '../rendering/ViewportEngine';
import { useQualityStore } from '../state/useQualityStore';

interface EngineContextValue {
  gpuInfo: GPUInfo;
  viewportState: ViewportState;
  qualityProfile: QualityProfile;
}

const EngineContext = createContext<EngineContextValue | null>(null);

export interface EngineProviderProps {
  children: React.ReactNode;
}

/**
 * EngineProvider — Top-level React context provider that initializes the
 * GPU detector, FPS monitor loop, viewport listener, and quality auto-scaler.
 */
export const EngineProvider: React.FC<EngineProviderProps> = ({ children }) => {
  const gpuInfo = useMemo(() => GPUDetector.getInstance().detect(), []);
  const [viewportState, setViewportState] = React.useState<ViewportState>(() =>
    ViewportEngine.getInstance().getState()
  );

  const { setGPUTier, setFPSMetrics, setProfile, profile } = useQualityStore();

  useEffect(() => {
    // 1. Sync GPU Tier
    setGPUTier(gpuInfo.tier);

    // 2. Subscribe to Viewport Engine
    const unsubscribeViewport = ViewportEngine.getInstance().subscribe((state) => {
      setViewportState(state);
    });

    // 3. Start FPS Monitor & subscribe quality auto-scaler
    const fpsMonitor = FPSMonitor.getInstance();
    fpsMonitor.start();

    const unsubscribeFPS = fpsMonitor.subscribe((metrics: FPSMetrics) => {
      setFPSMetrics(metrics.fps, metrics.frameTimeMs, metrics.isLowPerformance);
      const updatedProfile = AdaptiveQualityEngine.getInstance().updateFPSFeedback(metrics);
      setProfile(updatedProfile);
    });

    return () => {
      unsubscribeViewport();
      unsubscribeFPS();
      fpsMonitor.stop();
    };
  }, [gpuInfo, setGPUTier, setFPSMetrics, setProfile]);

  const value = useMemo(
    () => ({
      gpuInfo,
      viewportState,
      qualityProfile: profile,
    }),
    [gpuInfo, viewportState, profile]
  );

  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>;
};

export const useEngineContext = (): EngineContextValue => {
  const ctx = useContext(EngineContext);
  if (!ctx) {
    throw new Error('useEngineContext must be used within an <EngineProvider>');
  }
  return ctx;
};
