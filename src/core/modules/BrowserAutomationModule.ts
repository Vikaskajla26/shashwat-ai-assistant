/**
 * Browser Automation Subsystem Module for Shashwat AI OS (Phase 5 Browser Controller).
 * RULE #1: NEVER RETURN RAW LINKS TO THE USER. Always open/navigate in active or default browser window.
 * Supports: Chrome, Edge, Firefox, Brave, Opera, Arc.
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

  /* ------------------- Browser Automation Capabilities ------------------- */

  public async getDefaultBrowser(): Promise<any> {
    return await this.invokeBrowserIpc('browser:get-default-browser');
  }

  public async openWebsite(url: string): Promise<any> {
    return await this.invokeBrowserIpc('browser:open-external', url);
  }

  public async searchGoogle(query: string): Promise<any> {
    return await this.invokeBrowserIpc('browser:search-google', query);
  }

  public async openYouTube(query?: string): Promise<any> {
    return await this.invokeBrowserIpc('browser:open-youtube', query);
  }

  public async playMusic(songOrArtist: string): Promise<any> {
    return await this.invokeBrowserIpc('browser:play-music', songOrArtist);
  }

  public async searchPDF(topic: string): Promise<any> {
    return await this.invokeBrowserIpc('browser:search-pdf', topic);
  }

  public async openLoginPage(service: string): Promise<any> {
    return await this.invokeBrowserIpc('browser:login-page', service);
  }

  public async handleTab(action: 'new' | 'close' | 'next' | 'prev'): Promise<any> {
    return await this.invokeBrowserIpc('browser:handle-tab', action);
  }

  public async getHistory(): Promise<any> {
    return await this.invokeBrowserIpc('browser:get-history');
  }

  public async getBookmarks(): Promise<any> {
    return await this.invokeBrowserIpc('browser:get-bookmarks');
  }

  public async openDownloads(): Promise<any> {
    return await this.invokeBrowserIpc('browser:open-downloads');
  }

  private async invokeBrowserIpc(channel: string, ...args: any[]): Promise<any> {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        const api = (window as any).electronAPI;
        if (channel === 'browser:get-default-browser' && api.browser?.getDefaultBrowser) return await api.browser.getDefaultBrowser();
        if (channel === 'browser:open-external' && api.browser?.openExternal) return await api.browser.openExternal(args[0]);
      } catch (err: any) {
        this.handleError(err, channel);
      }
    }

    // Server API Fallback
    try {
      const res = await fetch('/api/browser/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, args }),
      }).then((r) => r.json());
      return res;
    } catch (err: any) {
      return { success: false, verified: false, message: `Action '${channel}' notice: ${err?.message || err}` };
    }
  }
}
