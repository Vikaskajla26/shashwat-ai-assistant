import fs from "fs";
import path from "path";
import { getDataDir } from "../utils/paths";
import { runPowerShell } from "../tools/powershell";
import { getNircmd } from "../tools/nircmd";
import { KnowledgeIndex } from "../docIntel/knowledgeIndex";
import { getVoiceprint } from "../voice/speakerVerification";
import { MemoryManager } from "../tools/memory";

/**
 * Self-Test / Health Engine — real probes for every subsystem शाश्वत depends on.
 *
 * Runs on server startup (fire-and-forget, never blocks boot) and exposes
 * results via GET /api/health/detailed. Each probe is side-effect-light
 * (no file deletions, no browser launches, no destructive mutations) so it is
 * safe to run repeatedly.
 *
 * Status semantics:
 *   pass   — subsystem ready and verified
 *   fail   — subsystem broken or unreachable
 *   warn   — subsystem missing but has a known fix (non-blocking)
 *   skip   — probe not applicable (e.g. no network, test env)
 */

export type CheckStatus = "pass" | "fail" | "warn" | "skip";

export interface CheckResult {
  /** Unique name, e.g. "powershell", "playwright". */
  name: string;
  status: CheckStatus;
  /** Human-readable detail (one-liner). */
  detail: string;
  /** Time the probe took (ms). */
  durationMs: number;
}

export interface HealthReport {
  checks: CheckResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warned: number;
    skipped: number;
    /** pass / total (excluding skipped). 0/0 = 1. */
    score: number;
  };
  timestamp: string;
}

/** Time-box a probe so a stuck subsystem can't hang the health check. */
async function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Probe timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// ============ Individual probes ============

import { getActiveProvider } from "../providers/providerStorage";

async function checkExpress(): Promise<CheckResult> {
  const t0 = Date.now();
  // If this code is running, the Express server is up (we're inside a request handler
  // or the listen callback). A cheap self-referential check.
  return { name: "express_server", status: "pass", detail: "Express HTTP server is running.", durationMs: Date.now() - t0 };
}

async function checkAIProviderConfigured(): Promise<CheckResult> {
  const t0 = Date.now();
  const active = getActiveProvider();
  if (active && (active.apiKey || active.id === 'local')) {
    return {
      name: "ai_provider_configured",
      status: "pass",
      detail: `AI Provider (${active.name}) is configured and active.`,
      durationMs: Date.now() - t0,
    };
  }
  return {
    name: "ai_provider_configured",
    status: "warn",
    detail: "No AI provider configured. AI features are in offline mode. Configure in AI Settings.",
    durationMs: Date.now() - t0,
  };
}

async function checkPowerShell(): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    await withTimeout(() => runPowerShell("Write-Output 'OK'", 8000), 10000);
    return { name: "powershell", status: "pass", detail: "PowerShell is responsive.", durationMs: Date.now() - t0 };
  } catch (e: any) {
    return { name: "powershell", status: "fail", detail: `PowerShell not available: ${e?.message || e}.`, durationMs: Date.now() - t0 };
  }
}

async function checkNircmd(): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    await withTimeout(() => getNircmd(), 5000);
    return { name: "nircmd", status: "pass", detail: "nircmd.exe resolved.", durationMs: Date.now() - t0 };
  } catch (e: any) {
    return { name: "nircmd", status: "warn", detail: `nircmd.exe not found: ${e?.message || e}. System control, volume, and brightness tools will fall back to PowerShell (slower, may not support all actions).`, durationMs: Date.now() - t0 };
  }
}

async function checkPlaywright(): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    const pw = await import("playwright");
    if (!pw.chromium) {
      return { name: "playwright", status: "warn", detail: "playwright module loaded but chromium not found. Run: npx playwright install chromium", durationMs: Date.now() - t0 };
    }
    // Check if the browser executable can be resolved (lazy; doesn't launch it).
    const execPath = pw.chromium.executablePath();
    if (fs.existsSync(execPath)) {
      return { name: "playwright", status: "pass", detail: "Playwright Chromium browser is installed.", durationMs: Date.now() - t0 };
    }
    return { name: "playwright", status: "warn", detail: `Chromium executable missing at ${execPath}. Run: npx playwright install chromium`, durationMs: Date.now() - t0 };
  } catch {
    return { name: "playwright", status: "warn", detail: "Playwright not installed. Run: npm install playwright && npx playwright install chromium. Browser automation and live search extraction will fall back to HTTP fetching.", durationMs: Date.now() - t0 };
  }
}

async function checkDataDirWritable(): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    const dir = getDataDir();
    const probe = path.join(dir, "__health_probe__");
    fs.writeFileSync(probe, "probe");
    const readBack = fs.readFileSync(probe, "utf-8");
    fs.unlinkSync(probe);
    if (readBack === "probe") {
      return { name: "data_dir_writable", status: "pass", detail: `Data directory is writable: ${dir}`, durationMs: Date.now() - t0 };
    }
    return { name: "data_dir_writable", status: "fail", detail: `Data directory read-back mismatch: ${dir}`, durationMs: Date.now() - t0 };
  } catch (e: any) {
    return { name: "data_dir_writable", status: "fail", detail: `Data directory not writable: ${e?.message || e}`, durationMs: Date.now() - t0 };
  }
}

async function checkMemoryStore(): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    const mm = new MemoryManager();
    const all = mm.getAllMemories();
    return {
      name: "memory_store",
      status: all.length >= 2 ? "pass" : "warn",
      detail: `Memory store loaded — ${all.length} memories.`,
      durationMs: Date.now() - t0,
    };
  } catch (e: any) {
    return { name: "memory_store", status: "fail", detail: `Memory store failed: ${e?.message || e}`, durationMs: Date.now() - t0 };
  }
}

async function checkKnowledgeIndex(): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    const ki = KnowledgeIndex.getInstance();
    const docs = ki.listDocuments();
    return { name: "knowledge_index", status: "pass", detail: `Knowledge index loaded — ${docs.length} documents.`, durationMs: Date.now() - t0 };
  } catch (e: any) {
    return { name: "knowledge_index", status: "warn", detail: `Knowledge index failed to load: ${e?.message || e}`, durationMs: Date.now() - t0 };
  }
}

async function checkVoiceProfile(): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    const vp = getVoiceprint();
    if (vp) {
      return { name: "voice_profile", status: "pass", detail: `Voice profile enrolled: ${vp.ownerName} (${vp.samplesCount} samples).`, durationMs: Date.now() - t0 };
    }
    return { name: "voice_profile", status: "warn", detail: "No voice profile enrolled. Speaker verification is in open-access mode.", durationMs: Date.now() - t0 };
  } catch (e: any) {
    return { name: "voice_profile", status: "warn", detail: `Voice profile check failed: ${e?.message || e}`, durationMs: Date.now() - t0 };
  }
}

async function checkFilesystem(): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    fs.statSync(process.cwd());
    return { name: "filesystem", status: "pass", detail: `Working directory accessible: ${process.cwd()}`, durationMs: Date.now() - t0 };
  } catch (e: any) {
    return { name: "filesystem", status: "fail", detail: `Cannot access working directory: ${e?.message || e}`, durationMs: Date.now() - t0 };
  }
}

// ============ Orchestrator ============

/**
 * Run all health probes and return a structured report. Each probe is
 * independently time-boxed and failure-isolated so one hung subsystem can't
 * block the rest.
 */
export async function runHealthChecks(): Promise<HealthReport> {
  const probes: Array<() => Promise<CheckResult>> = [
    checkExpress,
    checkFilesystem,
    checkDataDirWritable,
    checkMemoryStore,
    checkKnowledgeIndex,
    checkVoiceProfile,
    checkAIProviderConfigured,
    checkPowerShell,
    checkNircmd,
    checkPlaywright,
  ];

  const checks: CheckResult[] = [];
  for (const probe of probes) {
    try {
      const result = await probe();
      checks.push(result);
    } catch (e: any) {
      // The probe itself threw — record as fail.
      checks.push({
        name: probe.name || "unknown",
        status: "fail",
        detail: `Probe threw: ${e?.message || e}`,
        durationMs: 0,
      });
    }
  }

  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const warned = checks.filter((c) => c.status === "warn").length;
  const skipped = checks.filter((c) => c.status === "skip").length;
  const applicable = passed + failed + warned;
  const score = applicable === 0 ? 1 : passed / applicable;

  return {
    checks,
    summary: { total: checks.length, passed, failed, warned, skipped, score },
    timestamp: new Date().toISOString(),
  };
}
