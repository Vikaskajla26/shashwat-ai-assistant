/**
 * Micro-Kernel Supervisor & Self-Healing Engine for Shashwat AI OS.
 * Features:
 * - Periodic health pinging of all registered core modules
 * - Crash recovery: catches module errors & triggers independent module restart
 * - Exponential backoff to prevent infinite restart loops
 * - Ensures application NEVER freezes due to a single module fault
 */

import { ModuleManager } from './ModuleManager';
import { CentralLogger } from './CentralLogger';
import { EventBus } from './EventBus';
import { ModuleStatus } from './BaseModule';

export interface SupervisorConfig {
  checkIntervalMs: number;
  maxRetries: number;
  backoffBaseMs: number;
}

export class Supervisor {
  private static instance: Supervisor | null = null;
  private moduleManager = ModuleManager.getInstance();
  private logger = CentralLogger.getInstance();
  private eventBus = EventBus.getInstance();

  private checkTimer: any = null;
  private restartCounts: Map<string, number> = new Map();
  private lastRestartTimes: Map<string, number> = new Map();
  private config: SupervisorConfig = {
    checkIntervalMs: 5000, // Check every 5 seconds
    maxRetries: 5,
    backoffBaseMs: 2000,
  };

  private constructor() {
    this.subscribeToModuleEvents();
  }

  public static getInstance(): Supervisor {
    if (!Supervisor.instance) {
      Supervisor.instance = new Supervisor();
    }
    return Supervisor.instance;
  }

  /** Start supervisor watchdog */
  public start(config?: Partial<SupervisorConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    if (this.checkTimer) clearInterval(this.checkTimer);

    this.logger.info('Supervisor', `Started micro-kernel watchdog (Check interval: ${this.config.checkIntervalMs}ms)`);
    this.checkTimer = setInterval(() => this.runHealthChecks(), this.config.checkIntervalMs);
  }

  /** Stop supervisor watchdog */
  public stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
      this.logger.info('Supervisor', 'Watchdog stopped.');
    }
  }

  /** Listen for module errors to trigger immediate reactive recovery */
  private subscribeToModuleEvents(): void {
    this.eventBus.on('module:error', (payload: { moduleId: string; error: string }) => {
      this.logger.warn('Supervisor', `Reactive fault caught from '${payload.moduleId}': ${payload.error}`);
      this.handleModuleFailure(payload.moduleId, payload.error);
    });
  }

  /** Run periodic pings across all registered modules */
  private async runHealthChecks(): Promise<void> {
    const modules = this.moduleManager.getAllModules();

    for (const module of modules) {
      try {
        const health = await module.healthCheck();
        if (health.status === 'FAILED') {
          this.logger.error('Supervisor', `Module '${module.id}' reported FAILED status!`, health);
          this.handleModuleFailure(module.id, health.lastError || 'HealthCheck failed');
        } else if (health.status === 'DEGRADED') {
          this.logger.warn('Supervisor', `Module '${module.id}' is DEGRADED. Monitoring.`, health);
        }
      } catch (err: any) {
        this.logger.error('Supervisor', `HealthCheck exception for module '${module.id}': ${err?.message || err}`);
        this.handleModuleFailure(module.id, `HealthCheck exception: ${err?.message || String(err)}`);
      }
    }
  }

  /** Trigger independent module self-healing recovery */
  public async handleModuleFailure(moduleId: string, reason: string): Promise<void> {
    const count = (this.restartCounts.get(moduleId) || 0) + 1;
    const now = Date.now();
    const lastTime = this.lastRestartTimes.get(moduleId) || 0;

    // Reset count if last restart was > 5 minutes ago
    if (now - lastTime > 300000) {
      this.restartCounts.set(moduleId, 0);
    }

    if (count > this.config.maxRetries) {
      this.logger.fatal('Supervisor', `Module '${moduleId}' has exceeded max restart attempts (${this.config.maxRetries}). Pausing auto-recovery.`);
      this.eventBus.emit('supervisor:max_retries_exceeded', { moduleId, attempts: count }, 'Supervisor');
      return;
    }

    this.restartCounts.set(moduleId, count);
    this.lastRestartTimes.set(moduleId, now);

    // Exponential backoff delay
    const delay = Math.min(30000, this.config.backoffBaseMs * Math.pow(1.8, count - 1));
    this.logger.warn('Supervisor', `Scheduling self-healing restart for '${moduleId}' in ${Math.round(delay)}ms (Attempt ${count}/${this.config.maxRetries})`);

    this.eventBus.emit('supervisor:healing_scheduled', { moduleId, attempt: count, delayMs: delay, reason }, 'Supervisor');

    setTimeout(async () => {
      this.logger.info('Supervisor', `Executing independent recovery of '${moduleId}'...`);
      const success = await this.moduleManager.restartModule(moduleId);
      if (success) {
        this.logger.info('Supervisor', `Module '${moduleId}' successfully self-healed and resumed.`);
        this.eventBus.emit('supervisor:healed', { moduleId, attempt: count }, 'Supervisor');
      } else {
        this.logger.error('Supervisor', `Self-healing failed for '${moduleId}'. Will retry on next watchdog cycle.`);
      }
    }, delay);
  }

  /** Manually trigger recovery for a specific module (e.g. from UI Diagnostics button) */
  public async forceSelfHeal(moduleId: string): Promise<boolean> {
    this.logger.info('Supervisor', `Manual self-heal requested for '${moduleId}'`);
    this.restartCounts.set(moduleId, 0);
    return await this.moduleManager.restartModule(moduleId);
  }
}
