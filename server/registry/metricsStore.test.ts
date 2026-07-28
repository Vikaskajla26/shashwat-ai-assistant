import { describe, it, expect, beforeEach } from 'vitest';
import { recordOutcome, getStats, getAggregateStats, _resetForTest } from './metricsStore';

describe('MetricsStore System Tests', () => {
  beforeEach(() => {
    _resetForTest();
  });

  it('should record outcomes and compute execution statistics', () => {
    recordOutcome({ taskName: 'searchGoogle', durationMs: 150, success: true, startedAt: new Date().toISOString() });
    recordOutcome({ taskName: 'searchGoogle', durationMs: 250, success: true, startedAt: new Date().toISOString() });

    const stats = getStats('searchGoogle');
    expect(stats).toBeDefined();
    expect(stats.totalRuns).toBeGreaterThanOrEqual(2);
    expect(stats.successRate).toBeGreaterThan(0);
  });

  it('should compute aggregate system stats', () => {
    recordOutcome({ taskName: 'taskA', durationMs: 100, success: true, startedAt: new Date().toISOString() });
    recordOutcome({ taskName: 'taskB', durationMs: 200, success: false, startedAt: new Date().toISOString() });

    const agg = getAggregateStats();
    expect(agg.totalRuns).toBeGreaterThanOrEqual(2);
    expect(agg.overallSuccessRate).toBeGreaterThan(0);
  });
});
