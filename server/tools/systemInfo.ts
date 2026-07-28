import os from "os";
import { runPowerShell } from "./powershell";

/** Real device + environment context for the model. */
export async function getSystemInfo(): Promise<Record<string, any>> {
  const now = new Date();
  let screenResolution = "unknown";
  try {
    const out = (await runPowerShell(
      `Add-Type -AssemblyName System.Windows.Forms; ` +
        `[System.Windows.Forms.Screen]::PrimaryScreen.Bounds | ` +
        `ForEach-Object { "$($_.Width)x$($_.Height)" }`,
      6000
    )).trim();
    if (out) screenResolution = out.split(/\r?\n/)[0].trim();
  } catch { /* ignore */ }

  return {
    assistantName: "शाश्वत",
    localTime: now.toLocaleTimeString(),
    localDate: now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: process.platform,
    os: `${os.type()} ${os.release()}`,
    hostname: os.hostname(),
    arch: process.arch,
    cpuCount: os.cpus().length,
    totalMemoryGB: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10,
    freeMemoryGB: Math.round((os.freemem() / 1024 ** 3) * 10) / 10,
    online: await checkOnline(),
    screenResolution,
    homeDir: os.homedir(),
  };
}

// ---- Real (cached) reachability probe ----
let onlineCache: { value: boolean; expiresAt: number } = { value: true, expiresAt: 0 };
const ONLINE_CACHE_MS = 10_000;

/**
 * Probes real internet reachability with a short timeout and a brief cache so
 * repeated system-info calls don't each pay the latency. Falls back to false on
 * timeout/error — replacing the old hardcoded `return true`, which hid the
 * "no internet" validation scenario.
 *
 * Exported (and decoupled from fetch) so it can be unit-tested with an injected
 * probe function.
 */
export async function checkOnline(probe?: () => Promise<boolean>): Promise<boolean> {
  if (Date.now() < onlineCache.expiresAt) return onlineCache.value;
  const run = probe || defaultOnlineProbe;
  let value = false;
  try {
    value = await run();
  } catch {
    value = false;
  }
  onlineCache = { value, expiresAt: Date.now() + ONLINE_CACHE_MS };
  return value;
}

/** Test-only: clear the cache so an injected probe is always used. */
export function _resetOnlineCacheForTest(): void {
  onlineCache = { value: true, expiresAt: 0 };
}

async function defaultOnlineProbe(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    // A stable, lightweight endpoint; any 2xx/3xx/4xx means we have connectivity.
    const res = await fetch("https://www.gstatic.com/generate_204", {
      method: "HEAD",
      signal: controller.signal,
    });
    return res.status >= 200 && res.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
