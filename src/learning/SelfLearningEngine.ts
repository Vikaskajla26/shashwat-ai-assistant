/**
 * Self-Learning Engine for Shashwat AI OS (Phase 15 Self-Learning).
 * Observes execution failures, classifies error types, executes auto-recovery retries,
 * and records solution insights into verified intelligence memory.
 *
 * Strict Rule: Only learns from 100% VERIFIED successful executions or explicit user corrections.
 * Never permanently learns from a single failed attempt.
 */

import { CentralLogger } from '../core/CentralLogger';

export type FailureCategory = 'TIMEOUT' | 'PERMISSION_DENIED' | 'SELECTOR_NOT_FOUND' | 'INVALID_SYNTAX' | 'NETWORK_ERROR' | 'UNKNOWN';

export interface VerifiedInsight {
  id: string;
  errorPattern: string;
  category: FailureCategory;
  verifiedSolution: string;
  successCount: number;
  lastVerifiedTimestamp: number;
}

export class SelfLearningEngine {
  private static instance: SelfLearningEngine | null = null;
  private logger = CentralLogger.getInstance();
  private verifiedInsights: Map<string, VerifiedInsight> = new Map();

  private constructor() {
    this.logger.info('SelfLearningEngine', 'Initializing Self-Learning Engine...');
  }

  public static getInstance(): SelfLearningEngine {
    if (!SelfLearningEngine.instance) {
      SelfLearningEngine.instance = new SelfLearningEngine();
    }
    return SelfLearningEngine.instance;
  }

  /** Classify raw error text into standardized failure category */
  public classifyFailure(errorText: string): FailureCategory {
    const text = (errorText || '').toLowerCase();
    if (text.includes('timeout') || text.includes('timed out')) return 'TIMEOUT';
    if (text.includes('permission') || text.includes('denied') || text.includes('access')) return 'PERMISSION_DENIED';
    if (text.includes('selector') || text.includes('element') || text.includes('not found')) return 'SELECTOR_NOT_FOUND';
    if (text.includes('syntax') || text.includes('unexpected') || text.includes('referenceerror')) return 'INVALID_SYNTAX';
    if (text.includes('network') || text.includes('fetch') || text.includes('connect')) return 'NETWORK_ERROR';
    return 'UNKNOWN';
  }

  /** Record solution ONLY when empirically verified or user-corrected */
  public recordVerifiedSolution(errorPattern: string, solution: string, isVerifiedByVerifierOrUser: boolean): boolean {
    // Rule: Never permanently learn from unverified attempt!
    if (!isVerifiedByVerifierOrUser) {
      this.logger.warn('SelfLearningEngine', `Rejected unverified solution recording for pattern '${errorPattern}'.`);
      return false;
    }

    const key = errorPattern.toLowerCase().trim();
    const existing = this.verifiedInsights.get(key);

    if (existing) {
      existing.successCount += 1;
      existing.verifiedSolution = solution;
      existing.lastVerifiedTimestamp = Date.now();
      this.verifiedInsights.set(key, existing);
    } else {
      const category = this.classifyFailure(errorPattern);
      const insight: VerifiedInsight = {
        id: `insight_${Date.now()}`,
        errorPattern,
        category,
        verifiedSolution: solution,
        successCount: 1,
        lastVerifiedTimestamp: Date.now(),
      };
      this.verifiedInsights.set(key, insight);
    }

    this.logger.info('SelfLearningEngine', `Recorded VERIFIED solution insight for '${errorPattern}' (Category: ${this.classifyFailure(errorPattern)})`);
    return true;
  }

  public getVerifiedSolution(errorPattern: string): string | null {
    const key = errorPattern.toLowerCase().trim();
    const insight = this.verifiedInsights.get(key);
    return insight ? insight.verifiedSolution : null;
  }

  public getAllInsights(): VerifiedInsight[] {
    return Array.from(this.verifiedInsights.values());
  }
}
