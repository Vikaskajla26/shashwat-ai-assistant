import { runPowerShell } from "./powershell";

export interface ActiveBrowserInfo {
  isRunning: boolean;
  name: string;
  exe: string;
  pid?: number;
  windowTitle?: string;
}

const BROWSER_PROCESSES = [
  { exe: "chrome.exe", name: "Google Chrome" },
  { exe: "msedge.exe", name: "Microsoft Edge" },
  { exe: "firefox.exe", name: "Mozilla Firefox" },
  { exe: "brave.exe", name: "Brave Browser" },
  { exe: "opera.exe", name: "Opera Browser" },
  { exe: "arc.exe", name: "Arc Browser" },
];

/**
 * Detect if any supported web browser (Chrome, Edge, Firefox, Brave, Opera, Arc)
 * is currently running on the Windows operating system.
 */
export async function detectActiveBrowserProcess(): Promise<ActiveBrowserInfo> {
  try {
    const script = `
$processes = Get-Process | Where-Object { $_.MainWindowTitle -ne '' -and ($_.ProcessName -match 'chrome|msedge|firefox|brave|opera|arc') }
if ($processes) {
  $p = $processes | Select-Object -First 1
  "$($p.ProcessName)|$($p.Id)|$($p.MainWindowTitle)"
} else {
  ""
}
`;
    const out = (await runPowerShell(script, 5000)).trim();
    if (out && out.includes("|")) {
      const [procName, pidStr, title] = out.split("|");
      const matched = BROWSER_PROCESSES.find((b) => b.exe.toLowerCase().includes(procName.toLowerCase())) || {
        exe: `${procName}.exe`,
        name: procName,
      };
      return {
        isRunning: true,
        name: matched.name,
        exe: matched.exe,
        pid: parseInt(pidStr, 10) || undefined,
        windowTitle: title || matched.name,
      };
    }
  } catch (err) {
    console.warn("[WindowManager] Active browser detection notice:", err);
  }

  return {
    isRunning: false,
    name: "System Default Browser",
    exe: "chrome.exe",
  };
}

/**
 * Focus an active browser window on Windows using Win32 SetForegroundWindow.
 */
export async function focusBrowserWindow(browserInfo: ActiveBrowserInfo): Promise<boolean> {
  if (!browserInfo.isRunning || !browserInfo.pid) return false;

  try {
    const script = `
$pidToFocus = ${browserInfo.pid}
$code = @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
$proc = Get-Process -Id $pidToFocus -ErrorAction SilentlyContinue
if ($proc -and $proc.MainWindowHandle -ne [IntPtr]::Zero) {
    [Win32]::ShowWindow($proc.MainWindowHandle, 9)
    [Win32]::SetForegroundWindow($proc.MainWindowHandle)
    "SUCCESS"
} else {
    "FAILED"
}
`;
    const out = (await runPowerShell(script, 4000)).trim();
    return out === "SUCCESS";
  } catch (err) {
    console.warn("[WindowManager] Window focus notice:", err);
  }
  return false;
}
