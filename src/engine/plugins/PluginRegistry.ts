export interface ShashwatPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  onInit: () => void | Promise<void>;
  onEnable?: () => void;
  onDisable?: () => void;
  onTeardown?: () => void;
}

/**
 * PluginRegistry — Extensible plugin infrastructure allowing modular feature additions
 * (e.g. Sanskrit Chant Studio, Study Studio, Custom Visualizers) without mutating core code.
 */
export class PluginRegistry {
  private static instance: PluginRegistry | null = null;
  private plugins: Map<string, { plugin: ShashwatPlugin; enabled: boolean }> = new Map();

  public static getInstance(): PluginRegistry {
    if (!this.instance) {
      this.instance = new PluginRegistry();
    }
    return this.instance;
  }

  public async registerPlugin(plugin: ShashwatPlugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginRegistry] Plugin "${plugin.id}" is already registered.`);
      return;
    }

    try {
      await plugin.onInit();
      this.plugins.set(plugin.id, { plugin, enabled: true });
      if (plugin.onEnable) plugin.onEnable();
      console.log(`[PluginRegistry] Registered and enabled plugin: ${plugin.name} (v${plugin.version})`);
    } catch (err) {
      console.error(`[PluginRegistry] Failed to initialize plugin "${plugin.name}":`, err);
    }
  }

  public enablePlugin(id: string): void {
    const entry = this.plugins.get(id);
    if (entry && !entry.enabled) {
      entry.enabled = true;
      if (entry.plugin.onEnable) entry.plugin.onEnable();
    }
  }

  public disablePlugin(id: string): void {
    const entry = this.plugins.get(id);
    if (entry && entry.enabled) {
      entry.enabled = false;
      if (entry.plugin.onDisable) entry.plugin.onDisable();
    }
  }

  public listPlugins(): Array<{ id: string; name: string; version: string; enabled: boolean }> {
    return Array.from(this.plugins.values()).map(({ plugin, enabled }) => ({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      enabled,
    }));
  }
}
