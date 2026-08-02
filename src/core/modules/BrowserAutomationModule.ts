/**
 * Browser Automation Subsystem Module for Shashwat AI OS (Phase 6 Intelligent Sandbox Browser).
 * Enforces strict routing isolation:
 * - Everyday User Intent (YouTube, Google search, Music, Gmail, Facebook, Instagram) -> System Default Browser.
 * - AI Agent Tasks (Research, Article Reading, Summarization, Form Filling, Comparison, Data Extraction) -> Intelligent Sandbox Browser.
 */

import { BaseModule } from '../BaseModule';

export class BrowserAutomationModule extends BaseModule {
  public readonly id = 'browser_automation';
  public readonly name = 'Browser Automation Subsystem';

  public async init(): Promise<void> {
    this.logger.info(this.id, 'Initializing Browser Automation Subsystem (System + AI Sandbox)...');
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

  /* ------------------- Intent Routing & Dispatch ------------------- */

  public async handleWebIntent(promptOrUrl: string, payload?: any): Promise<any> {
    return await this.invokeBrowserIpc('sandbox:dispatch-intent', promptOrUrl, payload);
  }

  /* ------------------- System Browser Capabilities ------------------- */

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

  /* ------------------- AI Sandbox Browser Capabilities ------------------- */

  public async sandboxResearch(topic: string): Promise<any> {
    return await this.invokeBrowserIpc('sandbox:research', topic);
  }

  public async sandboxSummarize(url: string): Promise<any> {
    return await this.invokeBrowserIpc('sandbox:summarize', url);
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
