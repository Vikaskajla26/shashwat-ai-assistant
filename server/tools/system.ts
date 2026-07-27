import { runNircmd } from "./nircmd";
import { runPowerShell } from "./powershell";
import path from "path";
import os from "os";
import fs from "fs";

/**
 * Real Windows system + media controls, implemented via nircmd.
 * Each function performs the actual OS action and returns a descriptive result.
 */

export async function systemControl(
  action: string,
  level?: number
): Promise<{ executed: boolean; action: string; message: string; detail?: string }> {
  const a = String(action || "").toLowerCase().trim();

  switch (a) {
    case "volume_up": {
      const step = clampStep(level, 2000); // nircmd units: ~0..65535; 2000 ≈ +3%
      await runNircmd(["changesysvolume", String(step)]);
      return { executed: true, action: a, message: `Volume increased.` };
    }
    case "volume_down": {
      const step = clampStep(level, 2000);
      await runNircmd(["changesysvolume", String(-step)]);
      return { executed: true, action: a, message: `Volume decreased.` };
    }
    case "set_volume": {
      const v = Math.max(0, Math.min(100, typeof level === "number" ? level : 50));
      const units = Math.round((v / 100) * 65535);
      await runNircmd(["setsysvolume", String(units)]);
      return { executed: true, action: a, message: `Volume set to ${v}%.` };
    }
    case "mute":
    case "unmute": {
      // nircmd mutesysvolume 2 toggles; 0 unmutes; 1 mutes.
      await runNircmd(["mutesysvolume", a === "mute" ? "1" : "0"]);
      return { executed: true, action: a, message: a === "mute" ? "System audio muted." : "System audio unmuted." };
    }
    case "brightness_up": {
      // nircmd has no direct brightness API on most systems; use WMI via PowerShell.
      return changeBrightness("up");
    }
    case "brightness_down": {
      return changeBrightness("down");
    }
    case "lock_computer": {
      await runPowerShell("rundll32.exe user32.dll,LockWorkStation");
      return { executed: true, action: a, message: "Computer locked." };
    }
    case "show_desktop": {
      // Win+D via SendInput keystroke
      await sendWinKeyCombo("d");
      return { executed: true, action: a, message: "Showing desktop." };
    }
    case "close_window": {
      // Alt+F4 to the focused window
      await sendKeystroke("%{F4}");
      return { executed: true, action: a, message: "Closed the active window." };
    }
    case "screenshot": {
      const p = await captureScreenshot();
      return { executed: true, action: a, message: `Screenshot saved to ${p}.`, detail: p };
    }
    case "minimize_all": {
      await sendWinKeyCombo("m");
      return { executed: true, action: a, message: "Minimized all windows." };
    }
    default:
      return { executed: false, action: a, message: `Unknown system action: ${a}` };
  }
}

/** Media transport: play, pause, next, previous, fullscreen, speed_up. */
export async function mediaControl(
  command: string
): Promise<{ executed: boolean; command: string; message: string }> {
  const c = String(command || "").toLowerCase().trim();
  switch (c) {
    case "play":
    case "pause": {
      // Play/Pause media key
      await runNircmd(["sendkeypress", "medialaypause"]);
      return { executed: true, command: c, message: `${c === "play" ? "Play" : "Pause"} sent.` };
    }
    case "next": {
      await runNircmd(["sendkeypress", "medianext"]);
      return { executed: true, command: c, message: "Next track." };
    }
    case "previous": {
      await runNircmd(["sendkeypress", "mediaprev"]);
      return { executed: true, command: c, message: "Previous track." };
    }
    case "mute": {
      await runNircmd(["sendkeypress", "volmute"]);
      return { executed: true, command: c, message: "Mute toggled." };
    }
    case "volume_up": {
      await runNircmd(["sendkeypress", "volup"]);
      return { executed: true, command: c, message: "Volume up." };
    }
    case "volume_down": {
      await runNircmd(["sendkeypress", "voldown"]);
      return { executed: true, command: c, message: "Volume down." };
    }
    case "fullscreen": {
      await sendKeystroke("f");
      return { executed: true, command: c, message: "Fullscreen toggled (sent 'f')." };
    }
    case "speed_up": {
      await sendKeystroke(">");
      return { executed: true, command: c, message: "Playback speed increased." };
    }
    default:
      return { executed: false, command: c, message: `Unknown media command: ${c}` };
  }
}

/** Capture the full desktop to a PNG in ~/Pictures/Shashwat and return the path. */
async function captureScreenshot(): Promise<string> {
  const dir = path.join(os.homedir(), "Pictures", "Shashwat");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `screenshot-${stamp}.png`);

  // Use .NET to capture all monitors into one bitmap.
  const script = `
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bmp.Size)
$bmp.Save('${file.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
'SAVED'
`;
  await runPowerShell(script, 15000);
  return file;
}

/**
 * Send a Windows key combination (e.g. "d" with Win, or a literal SendKeys
 * string like "%{F4}"). Uses PowerShell SendKeys to the active window.
 */
async function sendKeystroke(keys: string): Promise<void> {
  const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait('${keys.replace(/'/g, "''")}')
`;
  await runPowerShell(script, 8000);
}

/** Hold Win and tap a letter (Win+D, Win+M, etc.) via SendInput. */
async function sendWinKeyCombo(letter: string): Promise<void> {
  // Use nircmd's sendkeypress for a reliable Win+letter combo.
  try {
    await runNircmd(["sendkeypress", `win+${letter.toLowerCase()}`]);
  } catch {
    // Fallback: SendKeys cannot easily do Win; emulate with Shell.Application minimize for "show desktop".
    await runPowerShell(
      `(New-Object -ComObject Shell.Application).MinimizeAll()`
    );
  }
}

/**
 * Adjust brightness via WMI WmiMonitorBrightnessMethods (works on many laptops).
 * Desktops without DDC/CI will report "not supported".
 */
async function changeBrightness(
  dir: "up" | "down"
): Promise<{ executed: boolean; action: string; message: string }> {
  try {
    const script = `
$ErrorActionPreference = 'Stop'
$mono = Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods -ErrorAction Stop
$cur = (Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness -ErrorAction SilentlyContinue).CurrentBrightness
if ($null -eq $cur) { $cur = 50 }
$step = 20
if ('${dir}' -eq 'up') { $n = [Math]::Min(100, $cur + $step) } else { $n = [Math]::Max(0, $cur - $step) }
$mono.WmiSetBrightness(1, $n) | Out-Null
"$n"
`;
    const out = (await runPowerShell(script, 10000)).trim();
    const n = parseInt(out, 10);
    return {
      executed: !Number.isNaN(n),
      action: `brightness_${dir}`,
      message: Number.isNaN(n)
        ? "Brightness control is not supported on this display."
        : `Brightness set to ${n}%.`,
    };
  } catch (e: any) {
    return {
      executed: false,
      action: `brightness_${dir}`,
      message: "Brightness control is not supported on this display.",
    };
  }
}

function clampStep(level: number | undefined, defaultStep: number): number {
  if (typeof level === "number" && Number.isFinite(level) && level > 0) {
    // treat level as a percentage 1..100 -> units
    return Math.max(200, Math.min(65535, Math.round((level / 100) * 65535)));
  }
  return defaultStep;
}
