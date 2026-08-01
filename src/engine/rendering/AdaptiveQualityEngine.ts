import { GPUDetector, GPUTier } from './GPUDetector';
import { FPSMetrics } from './FPSMonitor';

export interface QualityProfile {
  dpr: number;
  enablePostprocessing: boolean;
  enableShadows: boolean;
  shadowMapSize: number;
  particleMultiplier: number;
  bloomIntensity: number;
  resolutionScale: number;
}

/**
 * AdaptiveQualityEngine — Dynamically tunes rendering parameters (DPR, postprocessing,
 * shadows, particle counts) based on GPU capabilities and real-time FPS feedback.
 */
export class AdaptiveQualityEngine {
  private static instance: AdaptiveQualityEngine | null = null;
  private currentTier: GPUTier = 'tier-2-high';
  private currentProfile: QualityProfile;

  public static getInstance(): AdaptiveQualityEngine {
    if (!this.instance) {
      this.instance = new AdaptiveQualityEngine();
    }
    return this.instance;
  }

  constructor() {
    const gpuInfo = GPUDetector.getInstance().detect();
    this.currentTier = gpuInfo.tier;
    this.currentProfile = this.createProfileForTier(this.currentTier, gpuInfo.recommendedDPR);
  }

  public getProfile(): QualityProfile {
    return this.currentProfile;
  }

  public updateFPSFeedback(metrics: FPSMetrics): QualityProfile {
    // Auto-degrade if sustained low performance occurs
    if (metrics.fps < 30 && this.currentProfile.dpr > 1.0) {
      this.currentProfile = {
        ...this.currentProfile,
        dpr: Math.max(1.0, this.currentProfile.dpr - 0.25),
        particleMultiplier: Math.max(0.4, this.currentProfile.particleMultiplier - 0.2),
        enableShadows: false,
      };
    } else if (metrics.fps >= 58 && metrics.dropCount === 0 && this.currentProfile.dpr < 1.5) {
      // Safely upgrade quality if frame budget is stable
      const gpuInfo = GPUDetector.getInstance().detect();
      if (gpuInfo.tier === 'tier-3-ultra' || gpuInfo.tier === 'tier-2-high') {
        this.currentProfile.dpr = Math.min(gpuInfo.recommendedDPR, this.currentProfile.dpr + 0.1);
      }
    }
    return this.currentProfile;
  }

  private createProfileForTier(tier: GPUTier, baseDPR: number): QualityProfile {
    switch (tier) {
      case 'tier-3-ultra':
        return {
          dpr: Math.min(baseDPR, 2.0),
          enablePostprocessing: true,
          enableShadows: true,
          shadowMapSize: 2048,
          particleMultiplier: 1.0,
          bloomIntensity: 1.2,
          resolutionScale: 1.0,
        };
      case 'tier-2-high':
        return {
          dpr: Math.min(baseDPR, 1.5),
          enablePostprocessing: true,
          enableShadows: true,
          shadowMapSize: 1024,
          particleMultiplier: 0.8,
          bloomIntensity: 0.9,
          resolutionScale: 1.0,
        };
      case 'tier-1-medium':
        return {
          dpr: 1.0,
          enablePostprocessing: false,
          enableShadows: false,
          shadowMapSize: 512,
          particleMultiplier: 0.6,
          bloomIntensity: 0.5,
          resolutionScale: 0.9,
        };
      case 'tier-0-low':
      default:
        return {
          dpr: 1.0,
          enablePostprocessing: false,
          enableShadows: false,
          shadowMapSize: 256,
          particleMultiplier: 0.4,
          bloomIntensity: 0.0,
          resolutionScale: 0.75,
        };
    }
  }
}
