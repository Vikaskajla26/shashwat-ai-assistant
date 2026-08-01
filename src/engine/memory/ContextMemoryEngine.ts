export interface ContextFact {
  id: string;
  category: 'preference' | 'goal' | 'fact' | 'insight';
  key: string;
  value: string;
  timestamp: string;
}

/**
 * ContextMemoryEngine — Client/server memory cache and context retriever.
 */
export class ContextMemoryEngine {
  private static instance: ContextMemoryEngine | null = null;
  private facts: Map<string, ContextFact> = new Map();

  public static getInstance(): ContextMemoryEngine {
    if (!this.instance) {
      this.instance = new ContextMemoryEngine();
    }
    return this.instance;
  }

  public storeFact(category: ContextFact['category'], key: string, value: string): ContextFact {
    const id = `fact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fact: ContextFact = {
      id,
      category,
      key,
      value,
      timestamp: new Date().toISOString(),
    };
    this.facts.set(id, fact);
    return fact;
  }

  public queryMemory(searchTerm: string): ContextFact[] {
    const term = searchTerm.toLowerCase();
    const results: ContextFact[] = [];
    this.facts.forEach((fact) => {
      if (fact.key.toLowerCase().includes(term) || fact.value.toLowerCase().includes(term)) {
        results.push(fact);
      }
    });
    return results;
  }

  public getAllFacts(): ContextFact[] {
    return Array.from(this.facts.values());
  }
}
