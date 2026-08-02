/**
 * Health Monitor & Telemetry Collector for Shashwat AI OS.
 * Collects system diagnostics, latency, memory heuristics, and module status reports.
 */

import { ModuleManager } from './ModuleManager';
import { CentralLogger } from './CentralLogger';
import { EventBus } from './EventBus';
import { ModuleHealth } from './BaseModule';

export interface SystemDiagnosticsReport {
  timestamp: number;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  memoryMB: number;
  activeModulesCount: number;
  modules: Record<string, ModuleHealth>;
  recentErrors: number;
}

export class HealthMonitor {
  private static instance: HealthMonitor | null = null;
  private moduleManager = ModuleManager.getInstance();
  private logger = CentralLogger.getInstance();
  private eventBus = EventBus.getInstance();

  private constructor() {}

  public static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  /** Generate real-time system diagnostics report */
  public async getDiagnostics(): Promise<SystemDiagnosticsReport> {
    const modulesList = this.moduleManager.getAllModules();
    const modulesHealth: Record<string, ModuleHealth> = {};

    let failedCount = 0;
    let degradedCount = 0;

    for (const mod of modulesList) {
      const h = await mod.healthCheck();
      modulesHealth[mod.id] = h;

      if (h.status === 'FAILED') failedCount++;
      if (h.status === 'DEGRADED') degradedCount++;
    }

    const overallStatus = failedCount > 0 ? 'CRITICAL' : degradedCount > 0 ? 'DEGRADED' : 'HEALTHY';

    // Memory heuristics
    let memoryMB = 0;
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      memoryMB = Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024));
    }

    const recentLogs = this.logger.getRecentLogs();
    const recentErrors = recentLogs.filter((l) => l.level === 'ERROR' || l.level === 'FATAL').length;

    const report: SystemDiagnosticsReport = {
      timestamp: Date.now(),
      overallStatus,
      memoryMB,
      activeModulesCount: modulesList.length,
      modules: modulesHealth,
      recentErrors,
    };

    return report;
  }
}
