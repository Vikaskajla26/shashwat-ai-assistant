import { describe, it, expect, beforeEach } from 'vitest';
import { recordError, getAllErrors, getErrorStats, _resetForTest } from './errorIntelStore';

describe('ErrorIntelStore System Tests', () => {
  beforeEach(() => {
    _resetForTest();
  });

  it('should record error entries and perform root cause analysis', () => {
    const err = recordError({
      taskName: 'Playwright Browser',
      logs: 'Browser not found',
      exceptionName: 'BrowserNotFoundError',
      userCommand: 'Run test',
      category: 'Missing Dependency',
      rootCauseReason: 'Chromium binary missing',
      suggestedFix: 'Run npx playwright install',
      recoveryAttempted: 'Installed',
      recoverySucceeded: true,
    });

    expect(err.id).toBeDefined();
    expect(err.category).toBe('Missing Dependency');

    const all = getAllErrors();
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  it('should return error statistics', () => {
    recordError({
      taskName: 'TaskA',
      logs: 'Log',
      exceptionName: 'Err',
      userCommand: 'Cmd',
      category: 'Network',
      rootCauseReason: 'Reason',
      suggestedFix: 'Fix',
      recoveryAttempted: 'Attempt',
      recoverySucceeded: false,
    });

    const stats = getErrorStats();
    expect(stats.totalErrorsAnalyzed).toBeGreaterThanOrEqual(1);
  });
});
