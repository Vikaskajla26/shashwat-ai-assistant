import fs from "fs";
import path from "path";
import https from "https";
import { execFile } from "child_process";
import { runPowerShell } from "./powershell";

const BIN_DIR = path.join(process.cwd(), "bin");
const NIRCMD_PATH = path.join(BIN_DIR, "nircmd.exe");

// Official NirSoft download (nircmd-x64 zip). We unzip via PowerShell.
const NIRCMD_URL = "https://www.nirsoft.net/utils/nircmd-x64.zip";

let nircmdReady: Promise<string> | null = null;

/**
 * Resolves the path to nircmd.exe. If it is not present in ./bin or on PATH,
 * downloads it from NirSoft and extracts it. Returns the resolved path.
 */
export function getNircmd(): Promise<string> {
  if (nircmdReady) return nircmdReady;
  nircmdReady = ensureNircmd();
  return nircmdReady;
}

async function ensureNircmd(): Promise<string> {
  // 1. Already in ./bin
  if (fs.existsSync(NIRCMD_PATH)) return NIRCMD_PATH;

  // 2. On system PATH
  try {
    const onPath = await runPowerShell(
      `(Get-Command nircmd.exe -ErrorAction SilentlyContinue).Source`
    );
    const found = onPath.trim();
    if (found && fs.existsSync(found)) return found;
  } catch { /* not on path */ }

  // 3. Download + extract
  try {
    fs.mkdirSync(BIN_DIR, { recursive: true });
    const zipPath = path.join(BIN_DIR, "nircmd-x64.zip");
    await downloadFile(NIRCMD_URL, zipPath);
    await runPowerShell(
      `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${BIN_DIR}' -Force`
    );
    // The zip extracts nircmd.exe (and a few language files). Confirm.
    if (fs.existsSync(NIRCMD_PATH)) {
      try { fs.unlinkSync(zipPath); } catch { /* keep zip if unlink fails */ }
      console.log("[nircmd] downloaded to", NIRCMD_PATH);
      return NIRCMD_PATH;
    }
    // Some builds place it under a subfolder; search.
    const nested = await runPowerShell(
      `(Get-ChildItem -Path '${BIN_DIR}' -Recurse -Filter 'nircmd.exe' -ErrorAction SilentlyContinue | Select-Object -First 1).FullName`
    );
    const found = nested.trim();
    if (found && fs.existsSync(found)) return found;
    throw new Error("nircmd.exe not found after extraction");
  } catch (e: any) {
    nircmdReady = null; // allow retry next time
    throw new Error(
      `nircmd.exe is required for this action but could not be obtained automatically. ` +
      `Download nircmd-x64.zip from https://www.nirsoft.net/utils/nircmd.html and place nircmd.exe in ./bin. ` +
      `Detail: ${e?.message || e}`
    );
  }
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = (currentUrl: string) => {
      https
        .get(currentUrl, (res) => {
          // Follow redirect (www.nirsoft.net redirects).
          if (
            (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) &&
            res.headers.location
          ) {
            res.resume();
            const next = res.headers.location.startsWith("http")
              ? res.headers.location
              : new URL(res.headers.location, currentUrl).href;
            return req(next);
          }
          if (res.statusCode !== 200) {
            file.close();
            fs.unlink(dest, () => {});
            return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          }
          res.pipe(file);
          file.on("finish", () => file.close(() => resolve()));
        })
        .on("error", (err) => {
          file.close();
          fs.unlink(dest, () => {});
          reject(err);
        });
    };
    req(url);
  });
}

/** Run nircmd with the given arguments (already split). */
export function runNircmd(args: string[], timeoutMs = 10000): Promise<string> {
  return getNircmd().then(
    (exe) =>
      new Promise((resolve, reject) => {
        execFile(exe, args, { windowsHide: true, timeout: timeoutMs }, (err, stdout, stderr) => {
          if (err) reject(new Error(`nircmd failed: ${err.message}${stderr ? ` | ${stderr}` : ""}`));
          else resolve(stdout);
        });
      })
  );
}
