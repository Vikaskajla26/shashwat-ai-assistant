/**
 * Browser Automation Subsystem Module for Shashwat AI OS.
 * Handles default browser detection, external URL routing, and browser window control.
 */

import { BaseModule } from '../BaseModule';

export class BrowserAutomationModule extends BaseModule {
  public readonly id = 'browser_automation';
  public readonly name = 'Browser Automation Subsystem';

  public async init(): Promise<void> {
    this.logger.info(this.id, 'Initializing Browser Automation Subsystem...');
    this.status = 'UNINITIALIZED';
  }

  public async start(): Promise<void> {
    this.logger.info(this.id, 'Starting Browser Automation Subsystem...');
    this.status = 'RUNNING';
  }

  public async pause(): Promise<void> {
    this.status = 'PAUSED';
  }

  public async stop(): Promise<void> {
    this.status = 'UNINITIALIZED';
  }

  public async getDefaultBrowser(): Promise<any> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.browser?.getDefaultBrowser) {
      try {
        return await (window as any).electronAPI.browser.getDefaultBrowser();
      } catch (err: any) {
        this.handleError(err, 'getDefaultBrowser');
        return { name: 'System Default Browser', isDetected: false };
      }
    }
    return { name: 'System Default Browser', isDetected: false };
  }

  public async openExternal(url: string): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.browser?.openExternal) {
      try {
        return await (window as any).electronAPI.browser.openExternal(url);
      } catch (err: any) {
        this.handleError(err, 'openExternal');
        window.open(url, '_blank');
        return true;
      }
    } else {
      window.open(url, '_blank');
      return true;
    }
  }
}
