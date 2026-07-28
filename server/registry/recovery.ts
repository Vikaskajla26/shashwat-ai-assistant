import { classifyRisk } from "../tools/safety";
import {
  recordVerifiedFix,
  getVerifiedFix,
  type VerifiedFixRecord,
} from "./errorIntelStore";
import type { ErrorCategory } from "./errorIntelStore";
import { recordOutcome } from "./metricsStore";

/**
 * Retry + Recovery layer.
 *
 * Mission requirement: "If any task fails: identify root cause, retry safely
 * when appropriate, attempt alternate strategy, log the outcome, store verified
 * solutions, never repeat the same failure blindly."
 *
 * Design rules (conservative — reliability over speed):
 *   1. Only TRANSIENT error categories (Network / Timeout) are retried.
 *   2. Destructive or HIGH-risk actions are NEVER retried — a half-run delete
 *      must not be issued twice.
 *   3. Retries use exponential backoff and a hard max-attempts cap.
 *   4. When a verified fix exists for the error's problem key, it is applied
 *      (via the caller-supplied `fixers` map) BEFORE retrying — alternate strategy.
 *   5. Every recovery attempt is recorded in metrics so the dashboard reflects it.
 */

export interface RetryPolicy {
  /** Max attempts INCLUDING the first (so retries = attempts - 1). */
  maxAttempts: number;
  /** Base backoff in ms; actual delay = base * 2^(attempt-1). */
  baseDelayMs: number;
  /** Cap on a single backoff delay. */
  maxDelayMs: number;
}

const DEFAULT_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 400,
  maxDelayMs: 3000,
};

/** Categories considered transient enough to justify an automatic retry. */
const TRANSIENT: ReadonlySet<ErrorCategory> = new Set<ErrorCategory>([
  "Network",
  "Browser Timeout",
]);

/**
 * A function that, given an error's problem key, attempts a concrete recovery
 * action (e.g. install a missing binary). Returns true if it believes it fixed
 * the problem (so the caller should retry). Supplied by the caller so this
 * module stays free of tool-specific imports.
 */
export type RecoveryFixer = (problemKey: string, error?: unknown) => Promise<boolean>;

export interface RetryResult<T> {
  result: T;
  attempts: number;
  recoveryTried: boolean;
  recoverySucceeded: boolean;
  /** The error of the last failed attempt, if any. */
  lastError?: unknown;
}

/** Decide whether this task invocation is safe to retry at all. */
export function isRetryable(taskName: string, args: Record<string, any>): boolean {
  // Never retry a HIGH-risk / confirmation-gated action — even if the args
  // happen to be safe, the policy is to never re-issue them automatically.
  const risk = classifyRisk(taskName, args);
  if (risk.level === "HIGH") return false;

  // Explicit deny-list of actions that mutate the filesystem or system state.
  if (taskName === "file_operation") {
    const a = String(args.action || "").toLowerCase();
    if (["delete", "delete_file", "remove", "move", "rename"].includes(a)) return false;
  }
  if (taskName === "system_control") {
    const a = String(args.action || "").toLowerCase();
    if (["lock_computer", "close_window", "shutdown", "restart"].includes(a)) return false;
  }
  if (taskName === "delete_voice_profile") return false;
  return true;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Run `fn`, retrying on transient errors and applying known verified fixes.
 * On a fatal error or after exhausting attempts, re-throws the last error so
 * the caller's catch can record it.
 */
export async function withRetry<T>(
  taskName: string,
  args: Record<string, any>,
  fn: () => Promise<T>,
  opts: { policy?: Partial<RetryPolicy>; fixers?: Record<string, RecoveryFixer> } = {}
): Promise<RetryResult<T>> {
  const policy: RetryPolicy = { ...DEFAULT_POLICY, ...opts.policy };
  const fixers = opts.fixers || {};
  const retryable = isRetryable(taskName, args);

  let lastError: unknown;
  let recoveryTried = false;
  let recoverySucceeded = false;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      const result = await fn();
      return { result, attempts: attempt, recoveryTried, recoverySucceeded };
    } catch (err) {
      lastError = err;
      const cat = categorizeError(err);
      const problemKey = problemKeyFor(err);

      // First-attempt recovery: apply a known verified fix before any retry.
      const fix = getVerifiedFix(problemKey);
      const fixer = fixers[problemKey];
      if (fix && fixer && attempt < policy.maxAttempts) {
        recoveryTried = true;
        try {
          recoverySucceeded = await fixer(problemKey, err);
          recordVerifiedFix(problemKey, fix.problemDescription, fix.solutionAction, recoverySucceeded);
          if (recoverySucceeded) continue; // retry the operation
        } catch (fixErr) {
          console.warn(`[recovery] fixer for ${problemKey} threw:`, fixErr);
        }
      }

      // Retry policy: only transient categories, only retryable tasks, attempts remain.
      const shouldRetry =
        retryable && TRANSIENT.has(cat) && attempt < policy.maxAttempts;
      if (!shouldRetry) throw err;

      const delay = Math.min(
        policy.maxDelayMs,
        policy.baseDelayMs * Math.pow(2, attempt - 1)
      );
      await sleep(delay);
    }
  }
  // Unreachable — loop either returns or throws — but keep TS happy.
  throw lastError;
}

/**
 * Classify an arbitrary thrown value into one of the engine's ErrorCategory
 * values. Mirrors the heuristic in selfLearningEngine.analyzeError so the
 * recovery layer and the learning engine agree.
 */
export function categorizeError(err: unknown): ErrorCategory {
  const msg = String((err as any)?.message || err || "").toLowerCase();
  if (/enoent|missing|not found|executable does not exist/.test(msg))
    return "Missing Dependency";
  if (/eacces|permission|denied|epERM/.test(msg)) return "Permission";
  if (/timeout|timed out/.test(msg)) return "Browser Timeout";
  if (/fetch|network|connect|econnrefused|econnreset|aborted/.test(msg))
    return "Network";
  if (/ui|selector|element not bound|stale element/.test(msg)) return "UI Change";
  return "Unknown";
}

/** Stable problem key for an error — used to look up verified fixes. */
export function problemKeyFor(err: unknown): string {
  const name = (err as any)?.name || (err as any)?.code;
  if (name) return String(name);
  const msg = String((err as any)?.message || err || "");
  // First sentence/clause as a fallback key.
  return msg.split(/[.:]/)[0].slice(0, 80) || "Unknown";
}

/** Expose the verified-fix lookup for callers/tests. */
export function findVerifiedFix(problemKey: string): VerifiedFixRecord | undefined {
  return getVerifiedFix(problemKey);
}

/**
 * Record an outcome (success or failure) into the metrics store, tagging any
 * recovery that was attempted. Centralizes the metrics write so the executor
 * doesn't have to repeat the shape.
 */
export function logOutcome(
  taskName: string,
  startedAt: string,
  durationMs: number,
  success: boolean,
  retry: Pick<RetryResult<unknown>, "recoveryTried" | "recoverySucceeded">,
  error?: unknown
): void {
  recordOutcome({
    taskName,
    startedAt,
    durationMs,
    success,
    errorClass: success ? undefined : categorizeError(error),
    errorMessage: success ? undefined : String((error as any)?.message || error || ""),
    recoveryTried: retry.recoveryTried || undefined,
    recoverySucceeded: retry.recoverySucceeded || undefined,
  });
}
