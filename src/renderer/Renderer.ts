import * as THREE from 'three';
import { qualityRef } from '../perf/useRenderQuality';

export class EngineRenderer {
  public renderer: THREE.WebGLRenderer;

  constructor(container: HTMLDivElement, width: number, height: number) {
    const profile = qualityRef.current;

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: profile.antialias,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
    });

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.pixelRatioCap));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.debug.checkShaderErrors = true;

    (this.renderer as unknown as { useLegacyLights: boolean; physicallyCorrectLights: boolean }).useLegacyLights = false;
    (this.renderer as unknown as { useLegacyLights: boolean; physicallyCorrectLights: boolean }).physicallyCorrectLights = true;

    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.background = 'transparent';
    canvas.style.backgroundColor = 'transparent';
    canvas.style.border = 'none';
    canvas.style.outline = 'none';
    canvas.style.boxShadow = 'none';
    canvas.style.pointerEvents = 'none';

    container.appendChild(canvas);
  }

  public handleResize() {
    const profile = qualityRef.current;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.pixelRatioCap));
  }

  public dispose(container: HTMLDivElement) {
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    if (container.contains(this.renderer.domElement)) {
      container.removeChild(this.renderer.domElement);
    }
  }
}
