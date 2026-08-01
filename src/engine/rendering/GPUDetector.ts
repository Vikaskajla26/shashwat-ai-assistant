export type GPUTier = 'tier-0-low' | 'tier-1-medium' | 'tier-2-high' | 'tier-3-ultra';

export interface GPUInfo {
  tier: GPUTier;
  renderer: string;
  vendor: string;
  isMobile: boolean;
  maxTextureSize: number;
  devicePixelRatio: number;
  hardwareConcurrency: number;
  recommendedDPR: number;
  supportsFloatTextures: boolean;
}

/**
 * GPUDetector — Utility class that queries WebGL parameters to categorize
 * the user's graphics hardware and assign a performance tier.
 */
export class GPUDetector {
  private static instance: GPUDetector | null = null;
  private cachedInfo: GPUInfo | null = null;

  public static getInstance(): GPUDetector {
    if (!this.instance) {
      this.instance = new GPUDetector();
    }
    return this.instance;
  }

  public detect(): GPUInfo {
    if (this.cachedInfo) return this.cachedInfo;

    const isMobile =
      typeof navigator !== 'undefined' &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;

    let renderer = 'Unassigned Renderer';
    let vendor = 'Generic Vendor';
    let maxTextureSize = 4096;
    let supportsFloatTextures = false;

    if (typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        const gl = (canvas.getContext('webgl2') ||
          canvas.getContext('webgl') ||
          canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

        if (gl) {
          maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          if (ext) {
            renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || renderer;
            vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || vendor;
          }
          supportsFloatTextures = !!(
            gl.getExtension('OES_texture_float') || gl.getExtension('EXT_color_buffer_float')
          );
        }
      } catch (err) {
        console.warn('[GPUDetector] WebGL context probe warning:', err);
      }
    }

    // Determine Tier based on WebGL unmasked renderer strings & texture capabilities
    let tier: GPUTier = 'tier-2-high';
    const rLower = renderer.toLowerCase();

    if (
      rLower.includes('apple m') ||
      rLower.includes('rtx') ||
      rLower.includes('gtx 1080') ||
      rLower.includes('gtx 1070') ||
      rLower.includes('radeon rx')
    ) {
      tier = 'tier-3-ultra';
    } else if (
      rLower.includes('intel hd') ||
      rLower.includes('intel uhd') ||
      rLower.includes('swiftshader') ||
      rLower.includes('llvmpipe') ||
      isMobile
    ) {
      tier = 'tier-0-low';
    } else if (rLower.includes('gtx') || rLower.includes('radeon')) {
      tier = 'tier-2-high';
    } else {
      tier = 'tier-1-medium';
    }

    const recommendedDPR =
      tier === 'tier-3-ultra' ? Math.min(dpr, 2.0) : tier === 'tier-2-high' ? Math.min(dpr, 1.5) : 1.0;

    this.cachedInfo = {
      tier,
      renderer,
      vendor,
      isMobile,
      maxTextureSize,
      devicePixelRatio: dpr,
      hardwareConcurrency: cores,
      recommendedDPR,
      supportsFloatTextures,
    };

    return this.cachedInfo;
  }
}
