import { runPowerShell } from "./powershell";

/**
 * Maps common natural-language app names to Windows executable / start tokens.
 * Anything not here is resolved dynamically via Start Menu + App Paths registry.
 */
const APP_ALIASES: Record<string, string> = {
  // Browsers
  chrome: "chrome",
  "google chrome": "chrome",
  edge: "msedge",
  "microsoft edge": "msedge",
  firefox: "firefox",
  brave: "brave",
  // Dev
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
  // System
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
  // Media / creative
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
  "youtube music": "YouTube Music",
  // AI tools
  chatgpt: "https://chatgpt.com",
  // Camera / device
  camera: "microsoft.windows.camera:",
};

/** Returns the launch token (alias, exe, url, or shell verb) for an app name. */
function resolveAlias(rawApp: string): string | undefined {
  const key = rawApp.toLowerCase().trim();
  if (APP_ALIASES[key]) return APP_ALIASES[key];
  // Partial match
  for (const k of Object.keys(APP_ALIASES)) {
    if (key.includes(k) || k.includes(key)) return APP_ALIASES[k];
  }
  return undefined;
}

/**
 * Launch a desktop application for real. Strategy:
 *  1. If alias maps to a URL -> open in default browser.
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

  // 1. URL alias -> default browser
  if (alias && /^https?:\/\//i.test(alias)) {
    await openInDefaultBrowser(alias);
    return {
      launched: true,
      app,
      method: "browser",
      message: `Opened ${app} in the default browser.`,
      detail: alias,
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
      // fall through to resolution
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

  return {
    launched: false,
    app,
    method: "not_found",
    message: `I couldn't find an application named "${app}". Try the exact name.`,
  };
}

/**
 * Search Start Menu shortcuts (.lnk targets) and the App Paths registry for
 * an executable matching the app name. Returns an absolute path or null.
 */
async function resolveFromSystem(app: string): Promise<string | null> {
  const name = app.replace(/'/g, "''");
  // Look for a shortcut whose filename contains the app name; resolve its target.
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

/** Open a URL in the user's real default system browser. */
export async function openInDefaultBrowser(url: string): Promise<void> {
  const safe = url.replace(/'/g, "''");
  await runPowerShell(`Start-Process '${safe}'`, 8000);
}
