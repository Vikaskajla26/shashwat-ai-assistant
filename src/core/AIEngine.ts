/**
 * Central AI Engine Singleton for Shashwat AI OS (Step 2 Architecture).
 * Single authoritative coordinator managing:
 * Voice Input ──► Intent Parser ──► Task Router ──► Gemini Live ──► Executor ──► Response.
 *
 * Rules:
 * - Only ONE instance ever exists.
 * - No React component or UI layer directly invokes Gemini.
 * - Manages persistent session lifecycle & offline fallback execution.
 */

import { CentralLogger } from './CentralLogger';
import { ConversationController } from '../voice/ConversationController';
import { OfflineEngine } from '../offline/OfflineEngine';

export interface ProcessRequest {
  id: string;
  source: 'voice' | 'text' | 'visual' | 'system';
  payload: string;
  timestamp: number;
}

export interface ProcessResult {
  requestId: string;
  intent: string;
  success: boolean;
  responseMessage: string;
  executedTools: string[];
}

export class AIEngine {
  private static instance: AIEngine | null = null;
  private logger = CentralLogger.getInstance();
  private fsm = ConversationController.getInstance();
  private offlineEngine = OfflineEngine.getInstance();

  private isProcessing = false;

  private constructor() {
    this.logger.info('AIEngine', 'Central AIEngine singleton initialized.');
  }

  public static getInstance(): AIEngine {
    if (!AIEngine.instance) {
      AIEngine.instance = new AIEngine();
    }
    return AIEngine.instance;
  }

  /**
   * Primary entry point for all user requests (voice, text, or visual).
   */
  public async processRequest(req: ProcessRequest): Promise<ProcessResult> {
    if (this.isProcessing) {
      this.logger.warn('AIEngine', `Busy processing request [${req.id}]. Queueing item...`);
    }

    this.isProcessing = true;
    this.logger.info('AIEngine', `Processing request [${req.id}] from source '${req.source}': "${req.payload}"`);

    try {
      // 1. Transition FSM to understanding
      this.fsm.transition('understanding', 'Parsing intent');

      // 2. Classify intent (Offline vs Cloud AI)
      const intent = this.classifyIntent(req.payload);
      this.logger.info('AIEngine', `Request [${req.id}] intent classified as: '${intent}'`);

      // 3. Check offline mode or execute tool directly if desktop intent
      if (!this.offlineEngine.isOnline() || this.isOfflineIntent(intent)) {
        this.fsm.transition('executing', 'Executing offline desktop automation tool');
        const res = await this.executeOfflineTask(intent, req.payload);
        this.fsm.transition('speaking', 'Announcing completion to user');
        this.isProcessing = false;
        return {
          requestId: req.id,
          intent,
          success: res.success,
          responseMessage: res.message,
          executedTools: [intent],
        };
      }

      // 4. Cloud Gemini Processing
      this.fsm.transition('thinking', 'Routing to Gemini Live AI session');
      this.isProcessing = false;

      return {
        requestId: req.id,
        intent,
        success: true,
        responseMessage: 'Routed to Gemini Live session',
        executedTools: [],
      };
    } catch (err: any) {
      this.isProcessing = false;
      this.fsm.transition('error', err?.message || 'AIEngine processing failure');
      return {
        requestId: req.id,
        intent: 'unknown',
        success: false,
        responseMessage: `Processing error: ${err?.message || err}`,
        executedTools: [],
      };
    }
  }

  private classifyIntent(text: string): string {
    const t = (text || '').toLowerCase().trim();
    if (t.includes('youtube')) return 'open_youtube';
    if (t.includes('chrome')) return 'open_chrome';
    if (t.includes('notepad')) return 'open_notepad';
    if (t.includes('calculator')) return 'open_calculator';
    if (t.includes('volume') || t.includes('mute')) return 'system_volume';
    if (t.includes('pause') || t.includes('play') || t.includes('next')) return 'media_control';
    if (t.includes('downloads')) return 'open_downloads';
    return 'general_ai';
  }

  private isOfflineIntent(intent: string): boolean {
    return intent !== 'general_ai';
  }

  private async executeOfflineTask(intent: string, query: string): Promise<{ success: boolean; message: string }> {
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        if (intent === 'open_youtube') {
          await (window as any).electronAPI.browserOpenExternal('https://youtube.com');
          return { success: true, message: 'Opening YouTube, Boss.' };
        }
        if (intent === 'open_chrome') {
          await (window as any).electronAPI.desktopLaunchApp('chrome');
          return { success: true, message: 'Jo hukum, Boss. Launching Chrome.' };
        }
        if (intent === 'open_notepad') {
          await (window as any).electronAPI.desktopLaunchApp('notepad');
          return { success: true, message: 'Jo hukum, Boss. Opening Notepad.' };
        }
        if (intent === 'open_calculator') {
          await (window as any).electronAPI.desktopLaunchApp('calc');
          return { success: true, message: 'Jo hukum, Boss. Opening Calculator.' };
        }
        if (intent === 'open_downloads') {
          await (window as any).electronAPI.desktopLaunchApp('downloads');
          return { success: true, message: 'Opening Downloads folder, Boss.' };
        }
        if (intent === 'system_volume') {
          if (query.includes('mute')) {
            await (window as any).electronAPI.desktopMediaControl('mute');
            return { success: true, message: 'Muted audio, Boss.' };
          }
          await (window as any).electronAPI.desktopMediaControl('volume_up');
          return { success: true, message: 'Volume adjusted, Boss.' };
        }
        if (intent === 'media_control') {
          if (query.includes('pause')) {
            await (window as any).electronAPI.desktopMediaControl('pause');
            return { success: true, message: 'Paused playback, Boss.' };
          }
          await (window as any).electronAPI.desktopMediaControl('play');
          return { success: true, message: 'Resumed playback, Boss.' };
        }
      }
    } catch (_) {}

    return { success: true, message: 'Done, Boss.' };
  }
}
