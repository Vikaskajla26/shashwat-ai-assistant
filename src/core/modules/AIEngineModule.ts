/**
 * AI Engine Module for Shashwat AI OS.
 * Manages Gemini Live API sessions, LLM streaming, tool execution, and prompt routing.
 * Operates as an independent BaseModule with isolated lifecycle and restart capability.
 */

import { BaseModule } from '../BaseModule';
import { LiveSession } from '../../modules/LiveSession';
import { GlobalStateManager } from '../GlobalStateManager';

export class AIEngineModule extends BaseModule {
  public readonly id = 'ai_engine';
  public readonly name = 'AI Engine Subsystem';
  private liveSession: LiveSession | null = null;
  private stateManager = GlobalStateManager.getInstance();

  public async init(): Promise<void> {
    this.logger.info(this.id, 'Initializing AI Engine Subsystem...');
    this.liveSession = new LiveSession();
    this.status = 'UNINITIALIZED';
  }

  public async start(): Promise<void> {
    this.logger.info(this.id, 'Starting AI Engine Subsystem...');
    if (!this.liveSession) {
      await this.init();
    }
    
    try {
      await this.liveSession!.connect();
      this.status = 'RUNNING';
      this.logger.info(this.id, 'AI Engine Subsystem connected successfully.');
    } catch (err: any) {
      this.handleError(err, 'start');
    }
  }

  public async pause(): Promise<void> {
    this.status = 'PAUSED';
    this.logger.info(this.id, 'AI Engine Subsystem paused.');
  }

  public async stop(): Promise<void> {
    this.logger.info(this.id, 'Stopping AI Engine Subsystem...');
    if (this.liveSession) {
      try {
        this.liveSession.disconnect();
      } catch (_) {}
      this.liveSession = null;
    }
    this.status = 'UNINITIALIZED';
  }

  public getLiveSession(): LiveSession | null {
    return this.liveSession;
  }

  public async sendText(text: string): Promise<void> {
    if (!this.liveSession) {
      throw new Error('AI Engine is not initialized');
    }
    try {
      this.liveSession.sendTextMessage(text);
    } catch (err) {
      this.handleError(err, 'sendText');
      throw err;
    }
  }
}
