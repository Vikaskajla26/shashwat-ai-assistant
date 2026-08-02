/**
 * Module Manager Container for Shashwat AI OS.
 * Handles module registration, dependency sorting, lifecycle initiation, and lookup.
 */

import { IModule, ModuleStatus } from './BaseModule';
import { CentralLogger } from './CentralLogger';
import { EventBus } from './EventBus';

export class ModuleManager {
  private static instance: ModuleManager | null = null;
  private modules: Map<string, IModule> = new Map();
  private logger = CentralLogger.getInstance();
  private eventBus = EventBus.getInstance();

  private constructor() {}

  public static getInstance(): ModuleManager {
    if (!ModuleManager.instance) {
      ModuleManager.instance = new ModuleManager();
    }
    return ModuleManager.instance;
  }

  /** Register a module with the manager */
  public register(module: IModule): void {
    if (this.modules.has(module.id)) {
      this.logger.warn('ModuleManager', `Module '${module.id}' is already registered. Overwriting.`);
    }
    this.modules.set(module.id, module);
    this.logger.info('ModuleManager', `Registered module: ${module.name} (${module.id})`);
    this.eventBus.emit('module:registered', { moduleId: module.id, name: module.name }, 'ModuleManager');
  }

  /** Get a registered module by ID */
  public getModule<T extends IModule>(id: string): T | null {
    return (this.modules.get(id) as T) || null;
  }

  /** Return list of all registered modules */
  public getAllModules(): IModule[] {
    return Array.from(this.modules.values());
  }

  /** Initialize and start all modules in topological dependency order */
  public async bootAll(): Promise<void> {
    this.logger.info('ModuleManager', 'Booting all Shashwat AI OS core modules...');
    const sorted = this.getTopologicalOrder();

    for (const module of sorted) {
      try {
        this.logger.info('ModuleManager', `Initializing ${module.name}...`);
        await module.init();
        await module.start();
        this.logger.info('ModuleManager', `Successfully started ${module.name}.`);
      } catch (err: any) {
        this.logger.error('ModuleManager', `Failed to boot module ${module.id}: ${err?.message || err}`);
        // Do not crash the entire app if one module fails during boot!
        this.eventBus.emit('module:boot_failed', { moduleId: module.id, error: err?.message || String(err) }, 'ModuleManager');
      }
    }

    this.logger.info('ModuleManager', 'All Shashwat AI OS core modules boot sequence finished.');
    this.eventBus.emit('system:ready', { activeModuleCount: this.modules.size }, 'ModuleManager');
  }

  /** Restart a single module independently */
  public async restartModule(id: string): Promise<boolean> {
    const module = this.modules.get(id);
    if (!module) {
      this.logger.error('ModuleManager', `Cannot restart unknown module '${id}'`);
      return false;
    }

    try {
      this.logger.warn('ModuleManager', `Requesting independent restart of '${id}'...`);
      await module.restart();
      return true;
    } catch (err: any) {
      this.logger.error('ModuleManager', `Failed to restart module '${id}': ${err?.message || err}`);
      return false;
    }
  }

  /** Shutdown all modules gracefully */
  public async shutdownAll(): Promise<void> {
    this.logger.info('ModuleManager', 'Shutting down all core modules...');
    const reversed = this.getTopologicalOrder().reverse();
    for (const module of reversed) {
      try {
        await module.stop();
      } catch (err) {
        this.logger.error('ModuleManager', `Error stopping ${module.id}:`, err);
      }
    }
    this.logger.info('ModuleManager', 'All core modules stopped.');
  }

  /** Sort modules based on dependencies */
  private getTopologicalOrder(): IModule[] {
    const list = Array.from(this.modules.values());
    const visited = new Set<string>();
    const result: IModule[] = [];

    const visit = (m: IModule) => {
      if (visited.has(m.id)) return;
      visited.add(m.id);

      if (m.dependencies) {
        for (const depId of m.dependencies) {
          const dep = this.modules.get(depId);
          if (dep) visit(dep);
        }
      }
      result.push(m);
    };

    list.forEach(visit);
    return result;
  }
}
