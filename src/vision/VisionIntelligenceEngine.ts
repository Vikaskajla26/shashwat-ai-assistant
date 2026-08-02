/**
 * Vision Intelligence Subsystem Engine for Shashwat AI OS (Phase 8 Vision Intelligence).
 * Manages screen understanding, multi-monitor display capture, OCR, UI & button detection,
 * error & popup detection, cursor tracking, and visual reasoning.
 */

import { BaseModule } from '../core/BaseModule';

export interface DisplayMonitor {
  id: number;
  name: string;
  bounds: { x: number; y: number; width: number; height: number };
  isPrimary: boolean;
}

export class VisionIntelligenceEngine extends BaseModule {
  public readonly id = 'vision';
  public readonly name = 'Vision Intelligence Subsystem';

  public async init(): Promise<void> {
    this.logger.info(this.id, 'Initializing Vision Intelligence Subsystem...');
    this.status = 'UNINITIALIZED';
  }

  public async start(): Promise<void> {
    this.logger.info(this.id, 'Starting Vision Intelligence Subsystem...');
    this.status = 'RUNNING';
  }

  public async pause(): Promise<void> {
    this.status = 'PAUSED';
  }

  public async stop(): Promise<void> {
    this.status = 'UNINITIALIZED';
  }

  /* ------------------- Vision Subsystem Capabilities ------------------- */

  public async getMonitors(): Promise<DisplayMonitor[]> {
    return await this.invokeVisionIpc('vision:getMonitors');
  }

  public async getCursorPosition(): Promise<{ x: number; y: number }> {
    return await this.invokeVisionIpc('vision:getCursor');
  }

  public async captureDisplay(displayIndex = 0): Promise<{ base64: string; path: string }> {
    return await this.invokeVisionIpc('vision:captureDisplay', displayIndex);
  }

  public async analyzeScene(displayIndex = 0): Promise<any> {
    return await this.invokeVisionIpc('vision:analyzeScene', displayIndex);
  }

  private async invokeVisionIpc(channel: string, ...args: any[]): Promise<any> {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        const api = (window as any).electronAPI;
        if (channel === 'vision:getMonitors' && api.vision?.getMonitors) return await api.vision.getMonitors();
        if (channel === 'vision:analyzeScene' && api.vision?.analyzeScene) return await api.vision.analyzeScene(...args);
      } catch (err: any) {
        this.handleError(err, channel);
      }
    }

    // Server API Fallback
    try {
      const res = await fetch('/api/vision/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, args }),
      }).then((r) => r.json());
      return res;
    } catch (err: any) {
      return { success: false, verified: false, message: `Vision action '${channel}' notice: ${err?.message || err}` };
    }
  }
}
