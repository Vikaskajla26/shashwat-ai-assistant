import fs from "fs";
import path from "path";
import { getDataDir } from "../utils/paths";

/**
 * Error Intelligence Store — real persistence for the second of the Four
 * Cooperating Systems (त्रुटि प्रज्ञा).
 *
 * When the executor catches an error it calls `analyzeError()` (selfLearningEngine)
 * to classify it; the resulting record is appended here. Failures are grouped by
 * a `problemKey` so repeated root causes are counted rather than duplicated.
 *
 * A `VerifiedFix` is recorded once a recovery strategy actually resolves a
 * problem; `recovery.ts` looks these up to apply a known fix instead of blindly
 * retrying — satisfying "never repeat the same failure blindly".
 *
 * Persistence: <dataDir>/error_intel.json, atomic write, bounded log.
 */

export type ErrorCategory =
  | "Network"
  | "Permission"
  | "Missing Dependency"
  | "API Failure"
  | "Browser Timeout"
  | "UI Change"
  | "Human Input"
  | "Incorrect Reasoning"
  | "Unknown";

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
  confidenceScore: number; // 0..100
  timesVerified: number;
  lastUsedTimestamp: string;
}

interface ErrorIntelState {
  errorLogs: ErrorIntelligenceRecord[];
  verifiedFixes: VerifiedFixRecord[];
}

const MAX_ERROR_LOGS = 500;
const ERROR_INTEL_FILE = path.join(getDataDir(), "error_intel.json");

let state: ErrorIntelState | null = null;

function load(): ErrorIntelState {
  if (state) return state;
  try {
    if (!fs.existsSync(ERROR_INTEL_FILE)) {
      state = { errorLogs: [], verifiedFixes: [] };
      return state;
    }
    const raw = fs.readFileSync(ERROR_INTEL_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    state = {
      errorLogs: Array.isArray(parsed.errorLogs) ? parsed.errorLogs : [],
      verifiedFixes: Array.isArray(parsed.verifiedFixes) ? parsed.verifiedFixes : [],
    };
  } catch (e) {
    console.warn("[errorIntelStore] Failed to read error-intel file, starting fresh:", e);
    state = { errorLogs: [], verifiedFixes: [] };
  }
  return state;
}

function persist(): void {
  const s = load();
  const dir = getDataDir();
  try {
    fs.mkdirSync(dir, { recursive: true });
    const tmp = ERROR_INTEL_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(s, null, 0), "utf-8");
    fs.renameSync(tmp, ERROR_INTEL_FILE);
  } catch (e) {
    console.warn("[errorIntelStore] Failed to persist (keeping in-memory):", e);
  }
}

/**
 * Record a freshly-analyzed error. If a log with the same exceptionName + root
 * cause already exists, increment its occurrence count instead of duplicating.
 */
export function recordError(rec: Omit<ErrorIntelligenceRecord, "id" | "timestamp" | "occurrencesCount">): ErrorIntelligenceRecord {
  const s = load();
  const existing = s.errorLogs.find(
    (e) => e.exceptionName === rec.exceptionName && e.rootCauseReason === rec.rootCauseReason
  );
  if (existing) {
    existing.occurrencesCount += 1;
    existing.timestamp = new Date().toISOString();
    persist();
    return existing;
  }
  const full: ErrorIntelligenceRecord = {
    ...rec,
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    occurrencesCount: 1,
  };
  s.errorLogs.push(full);
  if (s.errorLogs.length > MAX_ERROR_LOGS) {
    s.errorLogs = s.errorLogs.slice(s.errorLogs.length - MAX_ERROR_LOGS);
  }
  persist();
  return full;
}

/**
 * Promote a recovery action into a verified fix. If a fix for the same
 * `problemKey` exists, increment its verification count.
 */
export function recordVerifiedFix(
  problemKey: string,
  problemDescription: string,
  solutionAction: string,
  succeeded: boolean
): VerifiedFixRecord {
  const s = load();
  const existing = s.verifiedFixes.find((f) => f.problemKey === problemKey);
  if (existing) {
    existing.timesVerified += 1;
    existing.lastUsedTimestamp = new Date().toISOString();
    if (succeeded) {
      existing.confidenceScore = Math.min(99, existing.confidenceScore + 2);
    } else {
      existing.confidenceScore = Math.max(5, existing.confidenceScore - 10);
    }
    persist();
    return existing;
  }
  const fix: VerifiedFixRecord = {
    id: `fix_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    problemKey,
    problemDescription,
    solutionAction,
    confidenceScore: succeeded ? 70 : 40,
    timesVerified: 1,
    lastUsedTimestamp: new Date().toISOString(),
  };
  s.verifiedFixes.push(fix);
  persist();
  return fix;
}

/**
 * Best known fix for a problem key (e.g. an exception name). Returns the fix
 * only if its confidence is high enough to be worth applying automatically.
 */
export function getVerifiedFix(problemKey: string): VerifiedFixRecord | undefined {
  const s = load();
  const fix = s.verifiedFixes.find((f) => f.problemKey === problemKey);
  return fix && fix.confidenceScore >= 60 ? fix : undefined;
}

export function getAllErrors(): ErrorIntelligenceRecord[] {
  return [...load().errorLogs];
}

export function getAllVerifiedFixes(): VerifiedFixRecord[] {
  return [...load().verifiedFixes];
}

export function getErrorStats(): {
  totalErrorsAnalyzed: number;
  groupedErrorPatternsCount: number;
  verifiedFixesCount: number;
} {
  const s = load();
  // A "grouped pattern" = distinct (exceptionName + rootCauseReason).
  const patterns = new Set(s.errorLogs.map((e) => `${e.exceptionName}::${e.rootCauseReason}`));
  return {
    totalErrorsAnalyzed: s.errorLogs.reduce((n, e) => n + e.occurrencesCount, 0),
    groupedErrorPatternsCount: patterns.size,
    verifiedFixesCount: s.verifiedFixes.length,
  };
}

/** Test-only. */
export function _resetForTest(): void {
  state = null;
}
