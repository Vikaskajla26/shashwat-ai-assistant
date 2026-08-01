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

/**
 * Media transport: play, pause, next, previous, fullscreen, speed_up.
 *
 * IMPORTANT: nircmd's `sendkeypress` only recognizes a documented set of
 * named keys (a-z, F1-F24, shift/ctrl/alt, arrows, etc.) — it does NOT have
 * named media keys like "medianext" or "volup". Those strings are silently
 * ignored by nircmd, which is why play/pause/next/previous/volume never
 * worked. Media keys must be sent as their real Windows virtual-key codes:
 *   0xAD = VK_VOLUME_MUTE       0xAE = VK_VOLUME_DOWN
 *   0xAF = VK_VOLUME_UP         0xB0 = VK_MEDIA_NEXT_TRACK
 *   0xB1 = VK_MEDIA_PREV_TRACK  0xB3 = VK_MEDIA_PLAY_PAUSE
 * These are standard OS-level media keys, so they control whatever app/tab
 * currently owns the active media session — including a YouTube tab open in
 * the user's real default browser (Chrome/Edge/Firefox all support the Media
 * Session API and respond to these keys).
 */
export async function mediaControl(
  command: string
): Promise<{ executed: boolean; command: string; message: string }> {
  const c = String(command || "").toLowerCase().trim();
  switch (c) {
    case "play":
    case "resume":
    case "pause": {
      await runNircmd(["sendkeypress", "0xB3"]); // VK_MEDIA_PLAY_PAUSE
      return { executed: true, command: c, message: `${c === "pause" ? "Paused" : "Playback resumed"}.` };
    }
    case "stop": {
      await runNircmd(["sendkeypress", "0xB2"]); // VK_MEDIA_STOP
      return { executed: true, command: c, message: "Playback stopped." };
    }
    case "next": {
      await runNircmd(["sendkeypress", "0xB0"]); // VK_MEDIA_NEXT_TRACK
      return { executed: true, command: c, message: "Next track." };
    }
    case "previous": {
      await runNircmd(["sendkeypress", "0xB1"]); // VK_MEDIA_PREV_TRACK
      return { executed: true, command: c, message: "Previous track." };
    }
    case "mute":
    case "unmute": {
      await runNircmd(["sendkeypress", "0xAD"]); // VK_VOLUME_MUTE
      return { executed: true, command: c, message: `${c === "mute" ? "Muted" : "Unmuted"}.` };
    }
    case "volume_up":
    case "increase_volume": {
      await runNircmd(["sendkeypress", "0xAF"]); // VK_VOLUME_UP
      return { executed: true, command: c, message: "Volume increased." };
    }
    case "volume_down":
    case "decrease_volume": {
      await runNircmd(["sendkeypress", "0xAE"]); // VK_VOLUME_DOWN
      return { executed: true, command: c, message: "Volume decreased." };
    }
    case "seek_forward": {
      await sendKeystroke("l"); // YouTube 10s forward or Right Arrow
      return { executed: true, command: c, message: "Seeked forward 10 seconds." };
    }
    case "seek_backward": {
      await sendKeystroke("j"); // YouTube 10s backward or Left Arrow
      return { executed: true, command: c, message: "Seeked backward 10 seconds." };
    }
    case "restart": {
      await sendKeystroke("0"); // YouTube restart video
      return { executed: true, command: c, message: "Restarted current media." };
    }
    case "fullscreen": {
      await sendKeystroke("f");
      return { executed: true, command: c, message: "Fullscreen toggled." };
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
