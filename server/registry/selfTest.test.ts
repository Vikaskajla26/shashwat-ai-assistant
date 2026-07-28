import { describe, it, expect } from 'vitest';
import { runHealthChecks } from './selfTest';

describe('SelfTestRunner System Tests', () => {
  it('should run diagnostic health checks cleanly', async () => {
    const report = await runHealthChecks();
    expect(report).toBeDefined();
    expect(report.summary.total).toBeGreaterThan(0);
    expect(report.checks.length).toBeGreaterThan(0);
  });
});
