/**
 * Base Module Lifecycle Interface & Abstract Class for Shashwat AI OS.
 * Enforces standardized init/start/pause/stop/healthCheck/restart methods
 * so modules can be isolated and restarted independently.
 */

import { CentralLogger } from './CentralLogger';
import { EventBus } from './EventBus';

export type ModuleStatus = 'UNINITIALIZED' | 'RUNNING' | 'PAUSED' | 'DEGRADED' | 'FAILED';

export interface ModuleHealth {
  status: ModuleStatus;
  lastPing: number;
  errorCount: number;
  lastError?: string;
  details?: Record<string, any>;
}

export interface IModule {
  id: string;
  name: string;
  dependencies?: string[];
  getStatus(): ModuleStatus;
  init(): Promise<void>;
  start(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  healthCheck(): Promise<ModuleHealth>;
  restart(): Promise<void>;
}

export abstract class BaseModule implements IModule {
  public abstract readonly id: string;
  public abstract readonly name: string;
  public readonly dependencies: string[] = [];

  protected status: ModuleStatus = 'UNINITIALIZED';
  protected logger = CentralLogger.getInstance();
  protected eventBus = EventBus.getInstance();
  protected errorCount = 0;
  protected lastError?: string;
  protected lastPing = Date.now();

  public getStatus(): ModuleStatus {
    return this.status;
  }

  public abstract init(): Promise<void>;
  public abstract start(): Promise<void>;
  public abstract pause(): Promise<void>;
  public abstract stop(): Promise<void>;

  public async healthCheck(): Promise<ModuleHealth> {
    this.lastPing = Date.now();
    return {
      status: this.status,
      lastPing: this.lastPing,
      errorCount: this.errorCount,
      lastError: this.lastError,
    };
  }

  public async restart(): Promise<void> {
    this.logger.warn(this.id, `Executing module restart...`);
    try {
      await this.stop();
    } catch (err: any) {
      this.logger.error(this.id, `Error stopping during restart: ${err?.message || err}`);
    }
    
    try {
      await this.init();
      await this.start();
      this.status = 'RUNNING';
      this.errorCount = 0;
      this.lastError = undefined;
      this.logger.info(this.id, `Module restarted successfully.`);
      this.eventBus.emit('module:restarted', { moduleId: this.id }, this.id);
    } catch (err: any) {
      this.status = 'FAILED';
      this.lastError = err?.message || String(err);
      this.logger.error(this.id, `Failed to restart module: ${this.lastError}`);
      throw err;
    }
  }

  protected handleError(err: any, context = 'Runtime'): void {
    this.errorCount++;
    this.lastError = err?.message || String(err);
    this.status = this.errorCount > 3 ? 'FAILED' : 'DEGRADED';
    this.logger.error(this.id, `[${context}] Error: ${this.lastError}`, err);
    this.eventBus.emit('module:error', { moduleId: this.id, error: this.lastError, context }, this.id);
  }
}
