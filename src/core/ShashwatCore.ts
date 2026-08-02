/**
 * Shashwat AI OS Kernel & Orchestrator.
 * Phase 1 — Core AI Foundation Implementation.
 * Registers all independent modules, boots dependency tree, and launches the Supervisor watchdog.
 */

import { ModuleManager } from './ModuleManager';
import { Supervisor } from './Supervisor';
import { CentralLogger } from './CentralLogger';
import { EventBus } from './EventBus';
import { GlobalStateManager } from './GlobalStateManager';
import { HealthMonitor } from './HealthMonitor';

// Modules
import { AIEngineModule } from './modules/AIEngineModule';
import { VoiceModule } from './modules/VoiceModule';
import { DesktopAutomationModule } from './modules/DesktopAutomationModule';
import { BrowserAutomationModule } from './modules/BrowserAutomationModule';
import { MemoryModule } from './modules/MemoryModule';
import { SettingsModule } from './modules/SettingsModule';
import { MediaModule } from './modules/MediaModule';

export class ShashwatCore {
  private static instance: ShashwatCore | null = null;

  public readonly moduleManager = ModuleManager.getInstance();
  public readonly supervisor = Supervisor.getInstance();
  public readonly logger = CentralLogger.getInstance();
  public readonly eventBus = EventBus.getInstance();
  public readonly stateManager = GlobalStateManager.getInstance();
  public readonly healthMonitor = HealthMonitor.getInstance();

  private isBooted = false;

  private constructor() {}

  public static getInstance(): ShashwatCore {
    if (!ShashwatCore.instance) {
      ShashwatCore.instance = new ShashwatCore();
    }
    return ShashwatCore.instance;
  }

  /** Initialize kernel, register modules, and start watchdog */
  public async boot(): Promise<void> {
    if (this.isBooted) {
      this.logger.warn('ShashwatCore', 'Kernel is already booted.');
      return;
    }

    this.logger.info('ShashwatCore', '================================================');
    this.logger.info('ShashwatCore', '  Booting शाश्वत AI OS Kernel (Phase 1 Foundation)  ');
    this.logger.info('ShashwatCore', '================================================');

    // Register all 7 core modules
    this.moduleManager.register(new SettingsModule());
    this.moduleManager.register(new MemoryModule());
    this.moduleManager.register(new AIEngineModule());
    this.moduleManager.register(new VoiceModule());
    this.moduleManager.register(new DesktopAutomationModule());
    this.moduleManager.register(new BrowserAutomationModule());
    this.moduleManager.register(new MediaModule());

    // Boot dependency tree
    await this.moduleManager.bootAll();

    // Start Supervisor watchdog
    this.supervisor.start({ checkIntervalMs: 5000 });

    this.isBooted = true;
    this.logger.info('ShashwatCore', '✨ Kernel boot sequence completed successfully.');
  }

  /** Graceful shutdown */
  public async shutdown(): Promise<void> {
    this.logger.info('ShashwatCore', 'Initiating kernel shutdown...');
    this.supervisor.stop();
    await this.moduleManager.shutdownAll();
    this.isBooted = false;
    this.logger.info('ShashwatCore', 'Kernel shut down cleanly.');
  }
}
