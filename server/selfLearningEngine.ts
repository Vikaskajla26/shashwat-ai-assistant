/**
 * शाश्वत Four Cooperating Self-Learning Systems Architecture
 *
 * SYSTEM 1: Experience Memory (अनुभव स्मृति)
 *   - Reads REAL execution outcomes from metricsStore (timing, success, tools).
 *
 * SYSTEM 2: Error Intelligence (त्रुटि प्रज्ञा)
 *   - Reads REAL persisted root-cause analysis + verified fixes from errorIntelStore.
 *
 * SYSTEM 3: Workflow Learning (कार्यप्रवाह शिक्षण)
 *   - Derives REAL recurring tool-name sequences from recent outcomes.
 *
 * SYSTEM 4: Improvement Engine (उन्नति तन्त्र)
 *   - Tracks validation test results; overallSystemHealth is computed from the
 *     live aggregate success rate (no longer a hardcoded number).
 *
 * IMPORTANT: this file previously shipped fabricated seed records (exp_1, err_1,
 * 96% health, "48 tasks executed"). Those were never produced by real execution.
 * They have been removed; the dashboard now shows live numbers that start near
 * zero and grow with actual use — which is correct, not a regression.
 */

import { getAllOutcomes, getAggregateStats, getStats } from "./registry/metricsStore";
import { getAllErrors, getAllVerifiedFixes, getErrorStats } from "./registry/errorIntelStore";

// ---- Shared type definitions (consumed by the dashboard UI) ----

export interface TaskExperienceRecord {
  id: string;
  taskName: string;
  userCommand: string;
  goal: string;
  context: string;
  executionSteps: string[];
  toolsUsed: string[];
  executionTimeMs: number;
  errors: string[];
  successStatus: boolean;
  recoveryActions: string[];
  finalOutcome: string;
  confidenceScore: number; // 0 - 100%
  timestamp: string;
}

export type ErrorCategory =
  | 'Network'
  | 'Permission'
  | 'Missing Dependency'
  | 'API Failure'
  | 'Browser Timeout'
  | 'UI Change'
  | 'Human Input'
  | 'Incorrect Reasoning'
  | 'Unknown';

export interface ErrorIntelligenceRecord {
  id: string;
  timestamp: string;
  taskName: string;
  logs: string;
  exceptionName: string;
  userCommand: string;
  category: ErrorCategory;
  rootCauseReason: string;
  suggestedFix: string;
  recoveryAttempted: string;
  recoverySucceeded: boolean;
  occurrencesCount: number;
}

export interface VerifiedFixRecord {
  id: string;
  problemKey: string;
  problemDescription: string;
  solutionAction: string;
  confidenceScore: number; // 0 - 100%
  timesVerified: number;
  lastUsedTimestamp: string;
}

export interface WorkflowSequence {
  id: string;
  sequenceName: string;
  triggerCommand: string;
  orderedSteps: string[];
  frequencyCount: number;
  confidenceScore: number;
  suggestedMacro: string;
}

export interface ValidationTestResult {
  testName: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  durationMs: number;
  notes: string;
}

export interface ImprovementProposal {
  id: string;
  title: string;
  targetComponent: string;
  explanation: string;
  diffContent: string;
  riskAssessment: 'LOW' | 'MEDIUM' | 'HIGH';
  validationResults: ValidationTestResult[];
  status: 'PROPOSED' | 'TESTING' | 'PROMOTED' | 'REJECTED' | 'ROLLED_BACK';
  createdTimestamp: string;
  promotedTimestamp?: string;
}

export interface FourSystemsLearningState {
  system1ExperienceMemory: {
    totalTasksExecuted: number;
    avgExecutionTimeMs: number;
    experiences: TaskExperienceRecord[];
  };
  system2ErrorIntelligence: {
    totalErrorsAnalyzed: number;
    groupedErrorPatternsCount: number;
    errorLogs: ErrorIntelligenceRecord[];
    verifiedFixes: VerifiedFixRecord[];
  };
  system3WorkflowLearning: {
    learnedHabitsCount: number;
    activeMacrosCount: number;
    learnedWorkflows: WorkflowSequence[];
  };
  system4ImprovementEngine: {
    totalProposalsCount: number;
    promotedImprovementsCount: number;
    overallSystemHealth: number; // 0 - 100%
    proposals: ImprovementProposal[];
  };
}

/**
 * Empty baseline state. Replaces the old fabricated seed data. The dashboard
 * starts here and is repopulated from the live stores via getFourSystemsState().
 */
export const EMPTY_FOUR_SYSTEMS_STATE: FourSystemsLearningState = {
  system1ExperienceMemory: {
    totalTasksExecuted: 0,
    avgExecutionTimeMs: 0,
    experiences: [],
  },
  system2ErrorIntelligence: {
    totalErrorsAnalyzed: 0,
    groupedErrorPatternsCount: 0,
    errorLogs: [],
    verifiedFixes: [],
  },
  system3WorkflowLearning: {
    learnedHabitsCount: 0,
    activeMacrosCount: 0,
    learnedWorkflows: [],
  },
  system4ImprovementEngine: {
    totalProposalsCount: 0,
    promotedImprovementsCount: 0,
    overallSystemHealth: 50, // neutral prior — no data yet
    proposals: [],
  },
};

// Back-compat alias for callers that referenced the old constant name.
export const INITIAL_FOUR_SYSTEMS_STATE = EMPTY_FOUR_SYSTEMS_STATE;

// ============ SYSTEM 2: analyzeError (called from the executor) ============

/**
 * Classify a thrown error into a category + root cause + suggested fix.
 * Used by the executor's catch path and persisted into errorIntelStore.
 * Pure function (no I/O) so it's unit-testable.
 */
export function analyzeError(
  taskName: string,
  errorObj: any,
  userCommand: string
): Omit<ErrorIntelligenceRecord, 'id' | 'timestamp' | 'occurrencesCount'> {
  const msg = String(errorObj?.message || errorObj || '').toLowerCase();
  let category: ErrorCategory = 'Unknown';
  let rootCauseReason = 'Unidentified exception during task execution.';
  let suggestedFix = 'Retry operation with alternative parameter.';

  if (msg.includes('enoent') || msg.includes('executable does not exist') || msg.includes('not found') || msg.includes('missing')) {
    category = 'Missing Dependency';
    rootCauseReason = 'File, command, or binary executable was not found on local path.';
    suggestedFix = 'Verify path location or run the installer command.';
  } else if (msg.includes('eacces') || msg.includes('permission') || msg.includes('denied') || msg.includes('eperm')) {
    category = 'Permission';
    rootCauseReason = 'System file or process permission restricted.';
    suggestedFix = 'Request administrative privilege or change working directory.';
  } else if (msg.includes('timeout') || msg.includes('timed out')) {
    category = 'Browser Timeout';
    rootCauseReason = 'Page network or DOM element load exceeded threshold.';
    suggestedFix = 'Increase wait duration or check network latency.';
  } else if (msg.includes('fetch') || msg.includes('network') || msg.includes('connect') || msg.includes('econnrefused')) {
    category = 'Network';
    rootCauseReason = 'Internet connection or endpoint HTTP request failed.';
    suggestedFix = 'Verify active internet connection.';
  }

  return {
    taskName,
    logs: String(errorObj?.message || errorObj),
    exceptionName: errorObj?.name || (errorObj?.code ? String(errorObj.code) : 'TaskExecutionError'),
    userCommand,
    category,
    rootCauseReason,
    suggestedFix,
    recoveryAttempted: suggestedFix,
    recoverySucceeded: false,
  };
}

// ============ SYSTEM 3: real workflow detection ============

/** Minimum times an identical consecutive tool sequence must appear to count as a habit. */
const MIN_SEQUENCE_FREQUENCY = 3;
const SEQUENCE_WINDOW = 3;

/**
 * Derive recurring ordered tool-name sequences from the real outcome log.
 * Looks for length-3 windows that repeat at least MIN_SEQUENCE_FREQUENCY times.
 * Pure (reads via getAllOutcomes).
 */
export function learnWorkflowSequences(
  recentLimit = 200
): WorkflowSequence[] {
  const outcomes = getAllOutcomes().slice(-recentLimit).map((o) => o.taskName);
  if (outcomes.length < SEQUENCE_WINDOW) return [];

  const seqCounts = new Map<string, { count: number; first: number }>();
  for (let i = 0; i + SEQUENCE_WINDOW <= outcomes.length; i++) {
    const key = outcomes.slice(i, i + SEQUENCE_WINDOW).join(' → ');
    const existing = seqCounts.get(key);
    if (existing) existing.count += 1;
    else seqCounts.set(key, { count: 1, first: i });
  }

  const workflows: WorkflowSequence[] = [];
  for (const [key, meta] of seqCounts.entries()) {
    if (meta.count < MIN_SEQUENCE_FREQUENCY) continue;
    const steps = key.split(' → ');
    const confidence = Math.min(99, 60 + meta.count * 6);
    workflows.push({
      id: `wf_${meta.first}_${steps.join('_')}`.replace(/\s+/g, ''),
      sequenceName: steps.join(' → '),
      triggerCommand: steps[0],
      orderedSteps: steps,
      frequencyCount: meta.count,
      confidenceScore: confidence,
      suggestedMacro: `Would you like me to run your usual workflow: "${key}"?`,
    });
  }
  // Highest frequency first.
  return workflows.sort((a, b) => b.frequencyCount - a.frequencyCount).slice(0, 10);
}

// ============ SYSTEM 4: improvement proposal helper ============

export function evaluateImprovementProposal(
  title: string,
  targetComponent: string,
  explanation: string,
  diffContent: string,
  validationResults: ValidationTestResult[],
  riskAssessment: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
): ImprovementProposal {
  return {
    id: `imp_${Date.now()}`,
    title,
    targetComponent,
    explanation,
    diffContent,
    riskAssessment,
    validationResults,
    status: 'PROPOSED',
    createdTimestamp: new Date().toISOString(),
  };
}

// ============ Assemble the LIVE Four-Systems state ============

/**
 * Build the dashboard state entirely from the real metrics + error-intel +
 * workflow stores. This is what /api/learning returns. Every number is derived
 * from actual execution, not seed data.
 */
export function getFourSystemsState(): FourSystemsLearningState {
  const aggregate = getAggregateStats();
  const outcomes = getAllOutcomes();

  // System 1: Experience Memory — project recent outcomes into display records.
  const recent = outcomes.slice(-25).reverse();
  const experiences: TaskExperienceRecord[] = recent.map((o, idx) => ({
    id: `exp_${o.startedAt}_${idx}`,
    taskName: o.taskName,
    userCommand: '',
    goal: o.taskName,
    context: o.errorClass ? `error: ${o.errorClass}` : 'ok',
    executionSteps: [],
    toolsUsed: [o.taskName],
    executionTimeMs: o.durationMs,
    errors: o.errorMessage ? [o.errorMessage] : [],
    successStatus: o.success,
    recoveryActions: o.recoveryTried ? [o.recoverySucceeded ? 'recovered' : 'recovery failed'] : [],
    finalOutcome: o.success ? 'success' : o.errorMessage || 'failed',
    confidenceScore: Math.round(getStats(o.taskName).confidence * 100),
    timestamp: o.startedAt,
  }));

  // System 2: Error Intelligence — straight from the store.
  const errorStats = getErrorStats();
  const errorLogs = getAllErrors();
  const verifiedFixes = getAllVerifiedFixes();

  // System 3: Workflow Learning — derived.
  const workflows = learnWorkflowSequences();

  // System 4: Improvement Engine — health = overall success rate (clamped, with
  // a neutral 50% prior when there's no data yet).
  const overallSystemHealth =
    aggregate.totalRuns === 0 ? 50 : Math.round(aggregate.overallSuccessRate * 100);

  return {
    system1ExperienceMemory: {
      totalTasksExecuted: aggregate.totalRuns,
      avgExecutionTimeMs: aggregate.avgDurationMs,
      experiences,
    },
    system2ErrorIntelligence: {
      totalErrorsAnalyzed: errorStats.totalErrorsAnalyzed,
      groupedErrorPatternsCount: errorStats.groupedErrorPatternsCount,
      errorLogs,
      verifiedFixes,
    },
    system3WorkflowLearning: {
      learnedHabitsCount: workflows.length,
      activeMacrosCount: workflows.filter((w) => w.confidenceScore >= 75).length,
      learnedWorkflows: workflows,
    },
    system4ImprovementEngine: {
      totalProposalsCount: 0,
      promotedImprovementsCount: 0,
      overallSystemHealth,
      proposals: [],
    },
  };
}
