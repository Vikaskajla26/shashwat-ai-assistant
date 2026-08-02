/**
 * Settings Subsystem Module for Shashwat AI OS.
 * Manages AI provider settings, API keys, user preferences, and auto-launch policy.
 */

import { BaseModule } from '../BaseModule';

export class SettingsModule extends BaseModule {
  public readonly id = 'settings';
  public readonly name = 'Settings & Provider Subsystem';

  public async init(): Promise<void> {
    this.logger.info(this.id, 'Initializing Settings Subsystem...');
    this.status = 'UNINITIALIZED';
  }

  public async start(): Promise<void> {
    this.logger.info(this.id, 'Starting Settings Subsystem...');
    this.status = 'RUNNING';
  }

  public async pause(): Promise<void> {
    this.status = 'PAUSED';
  }

  public async stop(): Promise<void> {
    this.status = 'UNINITIALIZED';
  }

  public async getProviders(): Promise<any> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.ai?.getProviders) {
      try {
        return await (window as any).electronAPI.ai.getProviders();
      } catch (err: any) {
        this.handleError(err, 'getProviders');
        return { success: false, providers: [] };
      }
    }
    return { success: false, providers: [] };
  }

  public async saveProvider(payload: any): Promise<any> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.ai?.saveProvider) {
      try {
        const result = await (window as any).electronAPI.ai.saveProvider(payload);
        this.eventBus.emit('settings:provider_updated', { id: payload.id }, this.id);
        return result;
      } catch (err: any) {
        this.handleError(err, 'saveProvider');
        return { success: false, message: err?.message || 'Save provider failed' };
      }
    }
    return { success: false, message: 'Electron AI API not available' };
  }
}
