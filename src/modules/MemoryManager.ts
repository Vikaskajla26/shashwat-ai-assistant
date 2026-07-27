export type MemoryCategory =
  | 'identity'
  | 'preferences'
  | 'projects'
  | 'relationships'
  | 'education'
  | 'career'
  | 'habits'
  | 'goals'
  | 'skills'
  | 'important_dates'
  | 'favorites'
  | 'devices'
  | 'conversation_history'
  | 'personal'
  | 'project'
  | 'preference'
  | 'conversation';

export type MemoryImportance = 'HIGH' | 'MEDIUM' | 'LOW';

export interface MemoryFact {
  id: string;
  category: MemoryCategory;
  key: string;
  value: string;
  importance: MemoryImportance;
  updatedAt: string;
}

const STORAGE_KEY = 'shaashvat_long_term_memory_v1';

const DEFAULT_MEMORIES: MemoryFact[] = [
  {
    id: 'default-1',
    category: 'preferences',
    key: 'Primary Language',
    value: 'Always begin conversations in Hindi, adapt smoothly to Hinglish or English if requested.',
    importance: 'HIGH',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default-2',
    category: 'preferences',
    key: 'Communication Style',
    value: 'Warm, witty, natural, concise (1-3 sentences in voice mode), empathetic.',
    importance: 'HIGH',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default-3',
    category: 'preferences',
    key: 'Desktop Control',
    value: 'Execute simple harmless actions immediately without asking for unnecessary confirmations.',
    importance: 'MEDIUM',
    updatedAt: new Date().toISOString(),
  },
];

export class MemoryManager {
  private static instance: MemoryManager;
  private memories: MemoryFact[] = [];

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: MemoryFact[] = JSON.parse(stored);
        this.memories = parsed.map((m) => ({
          ...m,
          importance: m.importance || (m.category === 'preference' ? 'MEDIUM' : 'HIGH'),
        }));
      } else {
        this.memories = [...DEFAULT_MEMORIES];
        this.saveToStorage();
      }
    } catch (e) {
      console.warn('Failed to load memory from localStorage:', e);
      this.memories = [...DEFAULT_MEMORIES];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memories));
    } catch (e) {
      console.warn('Failed to save memory to localStorage:', e);
    }
  }

  public rememberFact(
    category: MemoryCategory,
    key: string,
    value: string,
    importance: MemoryImportance = 'HIGH'
  ): MemoryFact {
    if (importance === 'LOW') {
      // Do not store LOW importance temporary chatter
      console.log(`[MemoryManager] Skipped LOW importance memory: ${key}`);
      return {
        id: 'skipped',
        category,
        key,
        value,
        importance: 'LOW',
        updatedAt: new Date().toISOString(),
      };
    }

    const existingIndex = this.memories.findIndex(
      (m) => m.category === category && m.key.toLowerCase() === key.toLowerCase()
    );

    const fact: MemoryFact = {
      id: existingIndex >= 0 ? this.memories[existingIndex].id : Date.now().toString(),
      category,
      key: key.trim(),
      value: value.trim(),
      importance,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      this.memories[existingIndex] = fact;
    } else {
      this.memories.push(fact);
    }

    this.saveToStorage();
    return fact;
  }

  public retrieveMemory(query?: string, category?: MemoryCategory): MemoryFact[] {
    let result = [...this.memories];

    if (category) {
      result = result.filter((m) => m.category === category);
    }

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.key.toLowerCase().includes(q) ||
          m.value.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public forgetMemory(key?: string, category?: MemoryCategory, clearAll?: boolean): boolean {
    if (clearAll) {
      this.memories = [];
      this.saveToStorage();
      return true;
    }

    if (key) {
      const k = key.toLowerCase().trim();
      const initialLength = this.memories.length;
      this.memories = this.memories.filter((m) => m.key.toLowerCase() !== k);
      this.saveToStorage();
      return this.memories.length < initialLength;
    }

    if (category) {
      const initialLength = this.memories.length;
      this.memories = this.memories.filter((m) => m.category !== category);
      this.saveToStorage();
      return this.memories.length < initialLength;
    }

    return false;
  }

  public getAllMemories(): MemoryFact[] {
    return [...this.memories];
  }

  public getMemorySummary(): string {
    if (this.memories.length === 0) {
      return 'No remembered facts stored yet.';
    }

    const categories: MemoryCategory[] = [
      'identity',
      'preferences',
      'projects',
      'relationships',
      'education',
      'career',
      'habits',
      'goals',
      'skills',
      'important_dates',
      'favorites',
      'devices',
      'conversation_history',
      'personal',
      'project',
      'preference',
      'conversation',
    ];
    const lines: string[] = [];

    for (const cat of categories) {
      const catMemories = this.memories.filter((m) => m.category === cat);
      if (catMemories.length > 0) {
        lines.push(`[${cat.toUpperCase()} MEMORY]`);
        catMemories.forEach((m) => {
          lines.push(`• (${m.importance}) ${m.key}: ${m.value}`);
        });
      }
    }

    return lines.join('\n');
  }

  public getStructuredMemoryJson(): Record<string, Record<string, string>> {
    const schemaCategories = [
      'identity',
      'preferences',
      'projects',
      'relationships',
      'education',
      'career',
      'habits',
      'goals',
      'skills',
      'important_dates',
      'favorites',
      'devices',
      'conversation_history',
    ];

    const result: Record<string, Record<string, string>> = {};

    for (const cat of schemaCategories) {
      result[cat] = {};
    }

    for (const mem of this.memories) {
      let targetCat = mem.category as string;
      if (targetCat === 'personal') targetCat = 'identity';
      if (targetCat === 'project') targetCat = 'projects';
      if (targetCat === 'preference') targetCat = 'preferences';
      if (targetCat === 'conversation') targetCat = 'conversation_history';

      if (!result[targetCat]) {
        result[targetCat] = {};
      }
      result[targetCat][mem.key] = mem.value;
    }

    return result;
  }

  public clearAllMemory(): void {
    this.memories = [];
    this.saveToStorage();
  }
}
