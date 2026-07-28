import fs from "fs";
import path from "path";
import { getDataDir } from "../utils/paths";

/**
 * Task Metrics Store — the real telemetry that backs the Task Health Dashboard,
 * confidence scores, and the Self-Learning engine.
 *
 * Every tool execution recorded by the executor (server/tools/index.ts) appends
 * a single `TaskOutcome` here. Stats are computed on demand from the log, so the
 * dashboard always reflects what actually happened — not seed data.
 *
 * Persistence:
 *   - file: <dataDir>/task_metrics.json  (a flat array of outcomes)
 *   - atomic write: tmp file + rename, so a crash mid-write can't corrupt the log
 *   - bounded: only the most recent MAX_OUTCOMES are retained (file can't grow forever)
 */

export interface TaskOutcome {
  taskName: string;
  startedAt: string; // ISO timestamp
  durationMs: number;
  success: boolean;
  /** Short error category, e.g. "Network" / "Permission" — undefined on success. */
  errorClass?: string;
  /** Human-readable error message — undefined on success. */
  errorMessage?: string;
  /** True if a recovery attempt (retry / verified fix) was made. */
  recoveryTried?: boolean;
  /** True if the recovery attempt succeeded (the task ultimately completed). */
  recoverySucceeded?: boolean;
  /** True if this execution was gated behind explicit user confirmation. */
  confirmed?: boolean;
}

export interface TaskStats {
  taskName: string;
  totalRuns: number;
  successCount: number;
  failureCount: number;
  /** Raw success rate over recorded history (0..1). */
  successRate: number;
  /** Bayesian-ish smoothed confidence (0..1) — never 0 for an untested task. */
  confidence: number;
  avgDurationMs: number;
  lastRunAt?: string;
  lastError?: string;
}

export interface AggregateStats {
  totalRuns: number;
  totalSuccess: number;
  totalFailure: number;
  overallSuccessRate: number;
  /** Mean of per-task confidence scores, weighted by run count. */
  overallConfidence: number;
  avgDurationMs: number;
  taskCount: number;
  worstTasks: TaskStats[]; // lowest confidence, >=3 runs
  bestTasks: TaskStats[]; // highest confidence, >=3 runs
  mostUsedTasks: TaskStats[]; // by totalRuns
}

const MAX_OUTCOMES = 1000;
/**
 * Beta-prior strengths for the smoothed confidence score. A brand-new task has
 * confidence 0.5 (prior mean = PRIOR_SUCC / (PRIOR_SUCC + PRIOR_FAIL)). Once it
 * has real data the prior washes out. Keeps the dashboard from showing 0%/100%
 * extremes on tiny samples.
 */
const PRIOR_SUCC = 2;
const PRIOR_FAIL = 2;

const METRICS_FILE = path.join(getDataDir(), "task_metrics.json");

let outcomeLog: TaskOutcome[] | null = null;
let writeScheduled = false;

/** Load lazily and defensively; a corrupt/missing file is treated as empty. */
function load(): TaskOutcome[] {
  if (outcomeLog) return outcomeLog;
  try {
    if (!fs.existsSync(METRICS_FILE)) {
      outcomeLog = [];
      return outcomeLog;
    }
    const raw = fs.readFileSync(METRICS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    outcomeLog = Array.isArray(parsed) ? (parsed as TaskOutcome[]) : [];
  } catch (e) {
    console.warn("[metricsStore] Failed to read metrics file, starting fresh:", e);
    outcomeLog = [];
  }
  return outcomeLog;
}

/**
 * Persist via temp-file + rename. Renames on the same volume are atomic on
 * Windows/POSIX, so a process kill during the write leaves either the old or
 * the new complete file — never a truncated half-write.
 */
function persistSync(): void {
  if (!outcomeLog) return;
  const dir = getDataDir();
  try {
    fs.mkdirSync(dir, { recursive: true });
    const tmp = METRICS_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(outcomeLog, null, 0), "utf-8");
    fs.renameSync(tmp, METRICS_FILE);
  } catch (e) {
    console.warn("[metricsStore] Failed to persist metrics (keeping in-memory):", e);
  }
}

/** Coalesce rapid bursts of writes into a single disk op. */
function schedulePersist(): void {
  if (writeScheduled) return;
  writeScheduled = true;
  setImmediate(() => {
    writeScheduled = false;
    persistSync();
  });
}

/** Record one execution outcome and persist (async, coalesced). */
export function recordOutcome(outcome: TaskOutcome): void {
  const log = load();
  log.push(outcome);
  // Bound the log to the most recent MAX_OUTCOMES entries.
  if (log.length > MAX_OUTCOMES) {
    outcomeLog = log.slice(log.length - MAX_OUTCOMES);
  }
  schedulePersist();
}

/** All recorded outcomes (newest last). Intended for the learning engine. */
export function getAllOutcomes(): TaskOutcome[] {
  return [...load()];
}

/**
 * Smoothed confidence for a single task using a Beta(prior_succ, prior_fail)
 * posterior mean: (succ + prior_succ) / (total + prior_succ + prior_fail).
 * An untested task therefore returns 0.5 rather than 0 or NaN.
 */
export function computeConfidence(taskName: string): number {
  const runs = load().filter((o) => o.taskName === taskName);
  const succ = runs.filter((o) => o.success).length;
  const total = runs.length;
  return (succ + PRIOR_SUCC) / (total + PRIOR_SUCC + PRIOR_FAIL);
}

export function getStats(taskName: string): TaskStats {
  const runs = load().filter((o) => o.taskName === taskName);
  const total = runs.length;
  const succ = runs.filter((o) => o.success).length;
  const fail = total - succ;
  const last = runs[runs.length - 1];
  const lastFailure = runs.filter((o) => !o.success).slice(-1)[0];
  return {
    taskName,
    totalRuns: total,
    successCount: succ,
    failureCount: fail,
    successRate: total === 0 ? 0 : succ / total,
    confidence: computeConfidence(taskName),
    avgDurationMs: total === 0 ? 0 : Math.round(runs.reduce((s, o) => s + o.durationMs, 0) / total),
    lastRunAt: last?.startedAt,
    lastError: lastFailure?.errorMessage,
  };
}

export function getAllStats(): TaskStats[] {
  const names = [...new Set(load().map((o) => o.taskName))];
  return names.map(getStats);
}

export function getAggregateStats(): AggregateStats {
  const log = load();
  const all = getAllStats();
  const totalRuns = log.length;
  const totalSuccess = log.filter((o) => o.success).length;
  const totalFailure = totalRuns - totalSuccess;
  const withRuns = all.filter((s) => s.totalRuns >= 3);

  return {
    totalRuns,
    totalSuccess,
    totalFailure,
    overallSuccessRate: totalRuns === 0 ? 0 : totalSuccess / totalRuns,
    overallConfidence:
      totalRuns === 0 ? 0.5 : all.reduce((s, t) => s + t.confidence * t.totalRuns, 0) / totalRuns,
    avgDurationMs: totalRuns === 0 ? 0 : Math.round(log.reduce((s, o) => s + o.durationMs, 0) / totalRuns),
    taskCount: all.length,
    worstTasks: [...withRuns].sort((a, b) => a.confidence - b.confidence).slice(0, 5),
    bestTasks: [...withRuns].sort((a, b) => b.confidence - a.confidence).slice(0, 5),
    mostUsedTasks: [...all].sort((a, b) => b.totalRuns - a.totalRuns).slice(0, 5),
  };
}

/** Test-only: clear the in-memory cache + force reload from disk. */
export function _resetForTest(): void {
  outcomeLog = null;
  writeScheduled = false;
}
