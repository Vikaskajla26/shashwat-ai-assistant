import fs from "fs";
import path from "path";

export type MemoryCategory =
  | "identity"
  | "preferences"
  | "projects"
  | "relationships"
  | "education"
  | "career"
  | "habits"
  | "goals"
  | "skills"
  | "important_dates"
  | "favorites"
  | "devices"
  | "conversation_history"
  | "personal"
  | "project"
  | "preference"
  | "conversation";

export type MemoryImportance = "HIGH" | "MEDIUM" | "LOW";

export interface MemoryFact {
  id: string;
  category: MemoryCategory;
  key: string;
  value: string;
  importance: MemoryImportance;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const MEMORY_FILE = path.join(DATA_DIR, "memory.json");

const DEFAULT_MEMORIES: MemoryFact[] = [
  {
    id: "default-1",
    category: "preferences",
    key: "Primary Language",
    value:
      "Always begin conversations in Hindi, adapt smoothly to Hinglish or English if requested.",
    importance: "HIGH",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "default-2",
    category: "preferences",
    key: "Communication Style",
    value:
      "Warm, witty, natural, concise (1-3 sentences in voice mode), empathetic.",
    importance: "HIGH",
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Server-side persistent long-term memory.
 * Replaces the browser localStorage implementation so the model and all
 * sessions share a single durable store.
 */
export class MemoryManager {
  private memories: MemoryFact[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (!fs.existsSync(MEMORY_FILE)) {
        this.memories = [...DEFAULT_MEMORIES];
        this.save();
        return;
      }
      const raw = fs.readFileSync(MEMORY_FILE, "utf-8");
      const parsed: MemoryFact[] = JSON.parse(raw);
      this.memories = (Array.isArray(parsed) ? parsed : []).map((m) => ({
        ...m,
        importance: m.importance || (m.category === "preference" ? "MEDIUM" : "HIGH"),
      }));
    } catch (e) {
      console.warn("[MemoryManager] Failed to load memory file:", e);
      this.memories = [...DEFAULT_MEMORIES];
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(MEMORY_FILE, JSON.stringify(this.memories, null, 2), "utf-8");
    } catch (e) {
      console.warn("[MemoryManager] Failed to save memory file:", e);
    }
  }

  public rememberFact(
    category: MemoryCategory,
    key: string,
    value: string,
    importance: MemoryImportance = "HIGH"
  ): MemoryFact {
    if (importance === "LOW") {
      // LOW importance = temporary chatter; never persisted
      return {
        id: "skipped",
        category,
        key,
        value,
        importance: "LOW",
        updatedAt: new Date().toISOString(),
      };
    }

    const idx = this.memories.findIndex(
      (m) => m.category === category && m.key.toLowerCase() === key.trim().toLowerCase()
    );

    const fact: MemoryFact = {
      id: idx >= 0 ? this.memories[idx].id : Date.now().toString() + Math.random().toString(36).slice(2, 6),
      category,
      key: key.trim(),
      value: value.trim(),
      importance,
      updatedAt: new Date().toISOString(),
    };

    if (idx >= 0) this.memories[idx] = fact;
    else this.memories.push(fact);

    this.save();
    return fact;
  }

  public retrieveMemory(query?: string, category?: string): MemoryFact[] {
    let result = [...this.memories];
    if (category) result = result.filter((m) => m.category === category);
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

  public forgetMemory(key?: string, category?: string, clearAll?: boolean): boolean {
    if (clearAll) {
      this.memories = [];
      this.save();
      return true;
    }
    if (key) {
      const k = key.toLowerCase().trim();
      const before = this.memories.length;
      this.memories = this.memories.filter((m) => m.key.toLowerCase() !== k);
      this.save();
      return this.memories.length < before;
    }
    if (category) {
      const before = this.memories.length;
      this.memories = this.memories.filter((m) => m.category !== category);
      this.save();
      return this.memories.length < before;
    }
    return false;
  }

  public getAllMemories(): MemoryFact[] {
    return [...this.memories];
  }
}
