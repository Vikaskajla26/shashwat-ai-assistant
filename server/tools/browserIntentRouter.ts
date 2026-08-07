/**
 * Browser Intent Router for Shashwat AI OS (Phase 6 Intelligent Sandbox Browser).
 * Enforces STRICT INTENT ROUTING ISOLATION:
 * - Everyday User Requests (YouTube, Google search, Music, Gmail, Facebook, Instagram) -> System Default Browser.
 * - AI Agent Tasks (Research, Article Reading, Summarization, Form Filling, Comparison, Data Extraction) -> Intelligent Sandbox Browser.
 */

import { BrowserControllerEngine } from './browserController';
import { sandboxExec } from './browser';

export type BrowserTarget = 'SYSTEM_BROWSER' | 'SANDBOX_BROWSER';

export interface IntentRouteResult {
  target: BrowserTarget;
  reason: string;
  action: string;
  payload?: any;
}

export class BrowserIntentRouter {
  private static instance: BrowserIntentRouter | null = null;

  private constructor() {}

  public static getInstance(): BrowserIntentRouter {
    if (!BrowserIntentRouter.instance) {
      BrowserIntentRouter.instance = new BrowserIntentRouter();
    }
    return BrowserIntentRouter.instance;
  }

  /**
   * Classify user prompt / command into System Browser vs Sandbox Browser intent
   */
  public classifyIntent(intentText: string): IntentRouteResult {
    const text = intentText.toLowerCase().trim();

    // 1. Everyday User Intent Keywords -> ALWAYS System Default Browser
    const systemBrowserKeywords = [
      'youtube',
      'search google',
      'google search',
      'play music',
      'play song',
      'spotify',
      'gmail',
      'email',
      'facebook',
      'instagram',
      'twitter',
      'x.com',
      'linkedin',
      'open chrome',
      'open edge',
      'open browser',
    ];

    for (const kw of systemBrowserKeywords) {
      if (text.includes(kw)) {
        return {
          target: 'SYSTEM_BROWSER',
          reason: `Everyday user intent matching keyword '${kw}' must use System Default Browser.`,
          action: text.includes('youtube')
            ? 'openYouTube'
            : text.includes('google')
            ? 'searchGoogle'
            : text.includes('music') || text.includes('song')
            ? 'playMusic'
            : 'openWebsite',
        };
      }
    }

    // 2. AI Task Keywords -> Intelligent Sandbox Browser
    const sandboxKeywords = [
      'research',
      'summarize',
      'summary',
      'article',
      'form fill',
      'fill form',
      'compare',
      'extract data',
      'extract table',
      'scrape',
      'read page',
      'analyze page',
    ];

    for (const kw of sandboxKeywords) {
      if (text.includes(kw)) {
        return {
          target: 'SANDBOX_BROWSER',
          reason: `AI Agent task matching keyword '${kw}' requires Intelligent Sandbox Browser.`,
          action: text.includes('summar') || text.includes('article')
            ? 'summarize'
            : text.includes('extract') || text.includes('table')
            ? 'extractData'
            : text.includes('form')
            ? 'fillForm'
            : text.includes('compare')
            ? 'compare'
            : 'research',
        };
      }
    }

    // Default fallback: If plain URL or simple site open -> System Browser
    if (/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(text)) {
      return {
        target: 'SYSTEM_BROWSER',
        reason: 'Direct website URL navigation defaults to System Browser.',
        action: 'openWebsite',
      };
    }

    // Otherwise AI Agent task -> Sandbox Browser
    return {
      target: 'SANDBOX_BROWSER',
      reason: 'Complex AI reasoning task routed to Intelligent Sandbox Browser.',
      action: 'research',
    };
  }

  /**
   * Dispatch request through classified target browser
   */
  public async dispatchIntent(promptOrUrl: string, payload?: any): Promise<any> {
    const route = this.classifyIntent(promptOrUrl);

    if (route.target === 'SYSTEM_BROWSER') {
      const engine = BrowserControllerEngine.getInstance();
      if (route.action === 'openYouTube') return await engine.openYouTube(promptOrUrl);
      if (route.action === 'searchGoogle') return await engine.searchGoogle(promptOrUrl);
      if (route.action === 'playMusic') return await engine.playMusic(promptOrUrl);
      return await engine.openWebsite(promptOrUrl);
    } else {
      // Sandbox Browser AI Execution
      return await sandboxExec({
        query: promptOrUrl,
        action: route.action,
        url: promptOrUrl,
        payload,
      });
    }
  }
}
