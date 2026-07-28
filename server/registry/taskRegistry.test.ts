import { describe, it, expect } from 'vitest';
import { getRegistry, getTaskMeta, validateConsistency } from './taskRegistry';

describe('TaskRegistry System Tests', () => {
  it('should return complete registry metadata for all registered tools', () => {
    const registry = getRegistry();
    expect(registry).toBeDefined();
    expect(registry.length).toBeGreaterThan(0);

    const firstTask = registry[0];
    expect(firstTask.name).toBeDefined();
    expect(firstTask.category).toBeDefined();
    expect(firstTask.riskLevel).toBeDefined();
  });

  it('should retrieve task metadata for specific tool name', () => {
    const meta = getTaskMeta('searchGoogle');
    expect(meta).toBeDefined();
    expect(meta?.name).toBe('searchGoogle');
  });

  it('should validate registry consistency cleanly', () => {
    const report = validateConsistency(['searchGoogle', 'getSystemInfo']);
    expect(report).toBeDefined();
    expect(report.totalDeclared).toBeGreaterThan(0);
    expect(report.totalCategories).toBeGreaterThan(0);
  });
});
