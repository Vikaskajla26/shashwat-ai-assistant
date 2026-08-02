/**
 * Backend Plugin & Security Manager Engine (Phases 12 & 13).
 */

import { PluginRegistry } from '../../src/plugins/PluginRegistry';
import { SecuritySystemEngine } from '../../src/security/SecuritySystemEngine';

export class PluginManagerEngine {
  private static instance: PluginManagerEngine | null = null;

  private constructor() {}

  public static getInstance(): PluginManagerEngine {
    if (!PluginManagerEngine.instance) {
      PluginManagerEngine.instance = new PluginManagerEngine();
    }
    return PluginManagerEngine.instance;
  }

  public getPlugins() {
    return PluginRegistry.getInstance().getAllPlugins();
  }

  public togglePlugin(id: string, enabled?: boolean) {
    return PluginRegistry.getInstance().togglePlugin(id, enabled);
  }

  public checkPermission(permissionType: any) {
    return SecuritySystemEngine.getInstance().checkPermission(permissionType);
  }

  public triggerEmergencyStop() {
    SecuritySystemEngine.getInstance().triggerEmergencyStop();
    return true;
  }

  public toggleSafeMode(active?: boolean) {
    return SecuritySystemEngine.getInstance().toggleSafeMode(active);
  }
}
