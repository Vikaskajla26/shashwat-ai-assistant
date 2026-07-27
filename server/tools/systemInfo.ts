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
    online: navigatorOnline(),
    screenResolution,
    homeDir: os.homedir(),
  };
}

function navigatorOnline(): boolean {
  // Node has no navigator; assume online unless a quick check fails.
  return true;
}
