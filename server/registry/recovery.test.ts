import { describe, it, expect } from 'vitest';
import { isRetryable, categorizeError, problemKeyFor } from './recovery';

describe('RecoveryEngine System Tests', () => {
  it('should categorize error types correctly', () => {
    const cat = categorizeError(new Error('ENOENT: file missing'));
    expect(cat).toBe('Missing Dependency');
  });

  it('should generate problem keys for root cause matching', () => {
    const key = problemKeyFor(new Error('BrowserNotFoundError: executable missing'));
    expect(key).toBeDefined();
    expect(key.length).toBeGreaterThan(0);
  });

  it('should evaluate whether a task is retryable', () => {
    const retryable = isRetryable('searchGoogle', { query: 'test' });
    expect(typeof retryable).toBe('boolean');
  });
});
