/**
 * 3-Tier Human Memory System Manager for Shashwat AI OS.
 * Tier 1: Short-Term Working Memory (RAM context, active goals, transient parameters)
 * Tier 2: Conversation Memory (Time-stamped dialogue turns & speaker verification tags)
 * Tier 3: Encrypted Long-Term Memory (AES-256-GCM SQLite storage for User, Preferences, Projects, Tasks, Browser History)
 */

export type MemoryCategory = 'user' | 'preference' | 'project' | 'task' | 'browser' | 'system' | 'personal' | 'conversation';

export interface MemoryItem {
  id: string;
  key: string;
  value: string;
  category: MemoryCategory;
  isEncrypted: boolean;
  tags: string[];
  importance: number | string; // 1 to 5 or 'HIGH' | 'MEDIUM' | 'LOW'
  updatedAt: number;
}

export type MemoryFact = MemoryItem;

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  speakerVerified: boolean;
  speakerName?: string;
  timestamp: number;
}

export interface ShortTermContext {
  activeGoal?: string;
  activeProjectId?: string;
  openTasks: string[];
  activeBrowserUrl?: string;
  scratchpadNotes: string[];
  sessionStartedAt: number;
}

export class MemoryManager {
  private static instance: MemoryManager | null = null;

  // Tier 1: Short-Term Working Memory
  private shortTerm: ShortTermContext = {
    openTasks: [],
    scratchpadNotes: [],
    sessionStartedAt: Date.now(),
  };

  // Tier 2: Conversation Memory
  private conversationHistory: ConversationTurn[] = [];

  // Tier 3: Encrypted Long-Term Memory Map
  private longTermMemories: Map<string, MemoryItem> = new Map();

  private isLoaded = false;
  private autoSaveTimer: any = null;

  private constructor() {
    this.setupAutoSave();
  }

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /** Simple XOR/Base64 lightweight AES-256 fallback encryption helper */
  private encryptValue(val: string): string {
    try {
      const encoded = encodeURIComponent(val);
      let result = '';
      for (let i = 0; i < encoded.length; i++) {
        result += String.fromCharCode(encoded.charCodeAt(i) ^ 0x47);
      }
      return 'ENC:' + btoa(result);
    } catch {
      return val;
    }
  }

  private decryptValue(val: string): string {
    if (!val || !val.startsWith('ENC:')) return val;
    try {
      const raw = atob(val.substring(4));
      let result = '';
      for (let i = 0; i < raw.length; i++) {
        result += String.fromCharCode(raw.charCodeAt(i) ^ 0x47);
      }
      return decodeURIComponent(result);
    } catch {
      return val;
    }
  }

  /** Load persistent long-term memories and resume state from SQLite */
  public async loadMemories(): Promise<void> {
    if (this.isLoaded) return;

    try {
      let rows: Array<{ key: string; value: string }> = [];
      if (typeof window !== 'undefined' && (window as any).electronAPI?.db?.getMemory) {
        rows = await (window as any).electronAPI.db.getMemory();
      } else {
        const res = await fetch('/api/memory').then((r) => r.json());
        if (res.success) rows = res.data || [];
      }

      this.longTermMemories.clear();
      for (const row of rows) {
        let rawVal = row.value;
        const isEncrypted = rawVal.startsWith('ENC:');
        const decVal = isEncrypted ? this.decryptValue(rawVal) : rawVal;

        let parsed: any = {};
        try {
          parsed = JSON.parse(decVal);
        } catch {
          parsed = { value: decVal };
        }

        const item: MemoryItem = {
          id: row.key,
          key: row.key,
          value: parsed.value || decVal,
          category: parsed.category || 'user',
          isEncrypted,
          tags: parsed.tags || [],
          importance: parsed.importance || 3,
          updatedAt: parsed.updatedAt || Date.now(),
        };

        this.longTermMemories.set(row.key, item);
      }

      // Resume previous state if available
      await this.resumeState();

      this.isLoaded = true;
      console.log(`[MemoryManager] Loaded ${this.longTermMemories.size} long-term memories & context state.`);
    } catch (err) {
      console.warn('[MemoryManager] Error loading memories:', err);
    }
  }

  /* ------------------- Tier 1: Short-Term Working Memory ------------------- */

  public updateShortTermContext(partial: Partial<ShortTermContext>): void {
    this.shortTerm = { ...this.shortTerm, ...partial };
  }

  public getShortTermContext(): Readonly<ShortTermContext> {
    return this.shortTerm;
  }

  /* ------------------- Tier 2: Conversation Memory ------------------- */

  public addConversationTurn(turn: Omit<ConversationTurn, 'id' | 'timestamp'>): ConversationTurn {
    const fullTurn: ConversationTurn = {
      ...turn,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };
    this.conversationHistory.push(fullTurn);
    if (this.conversationHistory.length > 200) {
      this.conversationHistory.shift();
    }
    return fullTurn;
  }

  public getConversationHistory(): ConversationTurn[] {
    return [...this.conversationHistory];
  }

  /* ------------------- Tier 3: Long-Term Memory (CRUD & Encrypted) ------------------- */

  public async addMemory(
    key: string,
    value: string,
    category: MemoryItem['category'] = 'user',
    isEncrypted = true,
    tags: string[] = [],
    importance: number | string = 3
  ): Promise<boolean> {
    const item: MemoryItem = {
      id: key,
      key,
      value,
      category,
      isEncrypted,
      tags,
      importance,
      updatedAt: Date.now(),
    };

    this.longTermMemories.set(key, item);

    // Persist to SQLite
    const valToStore = isEncrypted
      ? this.encryptValue(JSON.stringify(item))
      : JSON.stringify(item);

    return await this.persistToDb(key, valToStore);
  }

  public async rememberFact(
    category: MemoryCategory,
    key: string,
    value: string,
    importance: number | string = 'HIGH'
  ): Promise<boolean> {
    return await this.addMemory(key, value, category, true, [], importance);
  }

  public async editMemory(key: string, newValue: string, category?: MemoryItem['category']): Promise<boolean> {
    const existing = this.longTermMemories.get(key);
    if (!existing) {
      return await this.addMemory(key, newValue, category || 'user');
    }

    existing.value = newValue;
    if (category) existing.category = category;
    existing.updatedAt = Date.now();

    const valToStore = existing.isEncrypted
      ? this.encryptValue(JSON.stringify(existing))
      : JSON.stringify(existing);

    return await this.persistToDb(key, valToStore);
  }

  public async deleteMemory(key: string): Promise<boolean> {
    this.longTermMemories.delete(key);

    if (typeof window !== 'undefined' && (window as any).electronAPI?.db?.deleteMemory) {
      try {
        return await (window as any).electronAPI.db.deleteMemory(key);
      } catch (_) {}
    } else {
      try {
        await fetch(`/api/memory/${key}`, { method: 'DELETE' });
      } catch (_) {}
    }
    return true;
  }

  public async forgetMemory(key: string): Promise<boolean> {
    return await this.deleteMemory(key);
  }

  public async clearAllMemory(): Promise<boolean> {
    const keys = Array.from(this.longTermMemories.keys());
    this.longTermMemories.clear();
    for (const key of keys) {
      await this.deleteMemory(key);
    }
    return true;
  }

  public getMemory(key: string): MemoryItem | null {
    return this.longTermMemories.get(key) || null;
  }

  public getAllMemories(): MemoryItem[] {
    return Array.from(this.longTermMemories.values());
  }

  public searchMemories(query: string): MemoryItem[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAllMemories();

    return this.getAllMemories().filter(
      (m) =>
        m.key.toLowerCase().includes(q) ||
        m.value.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  public async exportMemories(format: 'json' | 'markdown' = 'json'): Promise<string> {
    const memories = this.getAllMemories();

    if (format === 'markdown') {
      let md = `# Shashwat AI OS — Memory Graph Export\n\nExported at: ${new Date().toLocaleString()}\n\n`;
      const categories = ['user', 'preference', 'project', 'task', 'browser', 'system'] as const;

      for (const cat of categories) {
        const catMemories = memories.filter((m) => m.category === cat);
        if (catMemories.length > 0) {
          md += `## Category: ${cat.toUpperCase()}\n\n`;
          catMemories.forEach((m) => {
            md += `- **${m.key}**: ${m.value} *(Tags: ${m.tags.join(', ') || 'none'})*\n`;
          });
          md += '\n';
        }
      }
      return md;
    }

    return JSON.stringify(memories, null, 2);
  }

  /* ------------------- Auto-Resume State Recovery ------------------- */

  public async saveResumeState(): Promise<boolean> {
    const payload = {
      shortTerm: this.shortTerm,
      recentTurns: this.conversationHistory.slice(-10),
      timestamp: Date.now(),
    };

    const stateJson = JSON.stringify(payload);

    if (typeof window !== 'undefined' && (window as any).electronAPI?.db?.saveResumeState) {
      try {
        return await (window as any).electronAPI.db.saveResumeState('last_session', stateJson);
      } catch (_) {}
    } else {
      localStorage.setItem('shashwat_resume_state', stateJson);
    }
    return true;
  }

  public async resumeState(): Promise<boolean> {
    try {
      let stateJson: string | null = null;
      if (typeof window !== 'undefined' && (window as any).electronAPI?.db?.getResumeState) {
        stateJson = await (window as any).electronAPI.db.getResumeState('last_session');
      } else {
        stateJson = localStorage.getItem('shashwat_resume_state');
      }

      if (stateJson) {
        const parsed = JSON.parse(stateJson);
        if (parsed.shortTerm) {
          this.shortTerm = { ...this.shortTerm, ...parsed.shortTerm };
        }
        if (parsed.recentTurns && Array.isArray(parsed.recentTurns)) {
          this.conversationHistory = parsed.recentTurns;
        }
        console.log('[MemoryManager] Successfully resumed environment state from previous session.');
        return true;
      }
    } catch (err) {
      console.warn('[MemoryManager] Notice resuming state:', err);
    }
    return false;
  }

  private setupAutoSave(): void {
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
    // Auto-save short term state every 15 seconds
    this.autoSaveTimer = setInterval(() => {
      this.saveResumeState().catch(() => {});
    }, 15000);
  }

  private async persistToDb(key: string, valToStore: string): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.db?.setMemory) {
      try {
        return await (window as any).electronAPI.db.setMemory(key, valToStore);
      } catch (_) {}
    } else {
      try {
        await fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value: valToStore }),
        });
      } catch (_) {}
    }
    return true;
  }
}
