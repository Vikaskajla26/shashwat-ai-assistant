import { runPowerShell } from "./powershell";
import { exec, execFile } from "child_process";
import { launchSystemDefaultBrowser } from "./browserRouter";

/**
 * Maps common natural-language app names and web sites to Windows executables or URLs.
 * Anything not here is resolved dynamically via Start Menu + App Paths registry.
 */
const APP_ALIASES: Record<string, string> = {
  // Common Web Services / Web Apps (Open in default browser)
  youtube: "https://www.youtube.com",
  "youtube.com": "https://www.youtube.com",
  yt: "https://www.youtube.com",
  "youtube music": "https://music.youtube.com",
  gmail: "https://mail.google.com",
  google: "https://www.google.com",
  amazon: "https://www.amazon.com",
  github: "https://github.com",
  twitter: "https://x.com",
  x: "https://x.com",
  linkedin: "https://www.linkedin.com",
  reddit: "https://www.reddit.com",
  chatgpt: "https://chatgpt.com",

  // Browsers
  chrome: "chrome",
  "google chrome": "chrome",
  edge: "msedge",
  "microsoft edge": "msedge",
  firefox: "firefox",
  brave: "brave",

  // Dev Tools
  "vs code": "code",
  vscode: "code",
  cursor: "cursor",
  "visual studio code": "code",

  // Editors / Office
  notepad: "notepad",
  word: "winword",
  "microsoft word": "winword",
  excel: "excel",
  "microsoft excel": "excel",
  powerpoint: "powerpnt",
  "microsoft powerpoint": "powerpnt",

  // System Apps
  calculator: "calc",
  calc: "calc",
  terminal: "wt",
  "windows terminal": "wt",
  powershell: "powershell",
  "command prompt": "cmd",
  cmd: "cmd",
  "task manager": "taskmgr",
  settings: "ms-settings:",
  "file explorer": "explorer",
  explorer: "explorer",

  // Media / Creative Desktop Apps
  spotify: "spotify",
  obs: "obs64",
  "obs studio": "obs64",
  discord: "Discord",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  "adobe premiere pro": "Adobe Premiere Pro",
  premiere: "Adobe Premiere Pro",
  photoshop: "Photoshop",
  capcut: "CapCut",

  // Camera / device
  camera: "microsoft.windows.camera:",
};

/** Returns the launch token (alias, exe, url, or shell verb) for an app name. */
function resolveAlias(rawApp: string): string | undefined {
  const key = rawApp.toLowerCase().trim();
  if (APP_ALIASES[key]) return APP_ALIASES[key];

  const cleaned = key.replace(/^(open|launch|run|start|go to)\s+/i, "").trim();
  if (APP_ALIASES[cleaned]) return APP_ALIASES[cleaned];

  // Word boundary exact match
  for (const [k, val] of Object.entries(APP_ALIASES)) {
    const regex = new RegExp(`\\b${k}\\b`, "i");
    if (regex.test(cleaned) || regex.test(key)) return val;
  }

  // Fallback inclusion match
  for (const [k, val] of Object.entries(APP_ALIASES)) {
    if (cleaned.includes(k) || key.includes(k)) return val;
  }

  return undefined;
}

/**
 * Launch a desktop application or web app natively. Strategy:
 *  1. If alias or input maps to a URL -> open in default browser.
 *  2. If alias maps to an app token -> Start-Process it.
 *  3. Otherwise resolve via Start Menu (App Execution Aliases + shortcuts) and
 *     the HKLM/HKCU "App Paths" registry; launch the first hit.
 */
export async function launchApp(rawApp: string): Promise<{
  launched: boolean;
  app: string;
  method: string;
  message: string;
  detail?: string;
}> {
  const app = rawApp.trim();
  const alias = resolveAlias(app);

  // 1. URL alias or domain input -> open in system default browser
  if ((alias && /^https?:\/\//i.test(alias)) || app.includes(".com") || app.includes(".org") || app.includes(".net")) {
    const targetUrl = (alias && /^https?:\/\//i.test(alias)) ? alias : (app.startsWith("http") ? app : `https://${app}`);
    await openInDefaultBrowser(targetUrl);
    return {
      launched: true,
      app,
      method: "browser",
      message: `Opened ${app} (${targetUrl}) in your default browser.`,
      detail: targetUrl,
    };
  }

  // 2. Direct alias token
  if (alias) {
    try {
      await runPowerShell(`Start-Process '${alias.replace(/'/g, "''")}' -ErrorAction Stop`);
      return {
        launched: true,
        app,
        method: "alias",
        message: `Launched ${app}.`,
        detail: alias,
      };
    } catch (e: any) {
      // fall through to system resolution
    }
  }

  // 3. Dynamic resolution: Start Menu + App Paths registry
  try {
    const target = await resolveFromSystem(app);
    if (target) {
      await runPowerShell(`Start-Process -FilePath '${target.replace(/'/g, "''")}' -ErrorAction Stop`);
      return {
        launched: true,
        app,
        method: "resolved",
        message: `Launched ${app}.`,
        detail: target,
      };
    }
  } catch (e: any) {
    return {
      launched: false,
      app,
      method: "resolved",
      message: `Could not launch ${app}: ${e?.message || e}`,
    };
  }

  // Fallback: If app name is common like "youtube", "google", "gmail"
  const webFallback: Record<string, string> = {
    youtube: "https://www.youtube.com",
    google: "https://www.google.com",
    gmail: "https://mail.google.com",
    amazon: "https://www.amazon.com",
  };

  const cleanLower = app.toLowerCase().trim();
  if (webFallback[cleanLower]) {
    const targetUrl = webFallback[cleanLower];
    await openInDefaultBrowser(targetUrl);
    return {
      launched: true,
      app,
      method: "web_fallback",
      message: `Opened ${app} in your default browser.`,
      detail: targetUrl,
    };
  }

  return {
    launched: false,
    app,
    method: "not_found",
    message: `I couldn't find an application named "${app}". Try the exact name or URL.`,
  };
}

/**
 * Search Start Menu shortcuts (.lnk targets) and the App Paths registry for
 * an executable matching the app name. Returns an absolute path or null.
 */
async function resolveFromSystem(app: string): Promise<string | null> {
  const name = app.replace(/'/g, "''");
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$name = '${name}'
$roots = @(
  "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs",
  "$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs"
)
$hit = $null
foreach ($root in $roots) {
  Get-ChildItem -Path $root -Recurse -Include *.lnk -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.BaseName -match [regex]::Escape($name)) {
      $sh = New-Object -ComObject WScript.Shell
      $t = $sh.CreateShortcut($_.FullName).TargetPath
      if ($t -and (Test-Path $t)) { $hit = $t; break }
    }
  }
  if ($hit) { break }
}
if (-not $hit) {
  foreach ($hive in 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths','HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths') {
    if (Test-Path $hive) {
      Get-ChildItem $hive | ForEach-Object {
        if ($_.PSChildName -match [regex]::Escape($name)) {
          $p = (Get-ItemProperty $_.PSPath).'(default)'
          if (-not $p) { $p = $_.PSChildName }
          if ($p) { $hit = $p; break }
        }
      }
    }
    if ($hit) { break }
  }
}
if ($hit) { $hit } else { '' }
`;
  const out = (await runPowerShell(script, 12000)).trim();
  return out || null;
}

/** Open a URL in the user's real default system browser safely and instantly. */
export async function openInDefaultBrowser(url: string): Promise<void> {
  if (!url) return;
  let target = url.trim();
  if (!target.startsWith("http://") && !target.startsWith("https://") && !target.startsWith("file://")) {
    target = "https://" + target;
  }
  const res = await launchSystemDefaultBrowser(target);
  if (!res.success) {
    console.warn("[openInDefaultBrowser] Launch result notice:", res.message);
  }
}
