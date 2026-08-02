/**
 * Plugin Registry for Shashwat AI OS (Phase 12 Plugin Architecture).
 * Manages 10 independent plugins: Desktop, Browser, Media, PDF, Research, Email, Calendar, Weather, Calculator, Notes.
 * Supports dynamic enable/disable and isolated execution.
 */

export interface PluginMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  enabled: boolean;
  version: string;
}

export class PluginRegistry {
  private static instance: PluginRegistry | null = null;
  private plugins: Map<string, PluginMeta> = new Map();

  private constructor() {
    this.registerDefaultPlugins();
  }

  public static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  private registerDefaultPlugins(): void {
    const defaults: PluginMeta[] = [
      { id: 'desktop', name: 'Desktop Automation', category: 'System', description: 'Windows app control, window resize, mouse & keyboard automation', enabled: true, version: '1.0.0' },
      { id: 'browser', name: 'Multi-Browser Controller', category: 'Web', description: 'Multi-browser registry controller for Chrome, Edge, Firefox, Brave, Arc', enabled: true, version: '1.0.0' },
      { id: 'media', name: 'Media Subsystem', category: 'Audio', description: 'Web Audio API player, waveform visualizer, volume controls', enabled: true, version: '1.0.0' },
      { id: 'pdf', name: 'PDF Document Intelligence', category: 'Document', description: 'PDF text extraction, handwritten notes export, OCR scanning', enabled: true, version: '1.0.0' },
      { id: 'research', name: 'Academic Research Engine', category: 'Research', description: 'PubMed, arXiv, EuropePMC citation lookup & literature search', enabled: true, version: '1.0.0' },
      { id: 'email', name: 'Email Assistant', category: 'Productivity', description: 'Email drafting, inbox summaries, notification parsing', enabled: true, version: '1.0.0' },
      { id: 'calendar', name: 'Calendar & Timeline', category: 'Productivity', description: 'Schedule matrix, task reminders, timeline synchronization', enabled: true, version: '1.0.0' },
      { id: 'weather', name: 'Weather Intelligence', category: 'Utility', description: 'Real-time atmospheric weather forecast & climate alerts', enabled: true, version: '1.0.0' },
      { id: 'calculator', name: 'Scientific Calculator', category: 'Utility', description: 'Scientific math computation engine & unit conversions', enabled: true, version: '1.0.0' },
      { id: 'notes', name: 'Student Brain Notes', category: 'Study', description: 'Markdown notes, MCQ quiz generator, flashcard decks', enabled: true, version: '1.0.0' },
    ];

    defaults.forEach((p) => this.plugins.set(p.id, p));
  }

  public getAllPlugins(): PluginMeta[] {
    return Array.from(this.plugins.values());
  }

  public isPluginEnabled(id: string): boolean {
    const plugin = this.plugins.get(id);
    return plugin ? plugin.enabled : false;
  }

  public togglePlugin(id: string, enabled?: boolean): boolean {
    const plugin = this.plugins.get(id);
    if (plugin) {
      plugin.enabled = enabled !== undefined ? enabled : !plugin.enabled;
      this.plugins.set(id, plugin);
      return plugin.enabled;
    }
    return false;
  }
}
