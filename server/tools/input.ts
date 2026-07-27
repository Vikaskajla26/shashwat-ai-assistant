import { runPowerShell } from "./powershell";

/**
 * Real global mouse + keyboard input via .NET SendInput through PowerShell.
 * Works on any focused window (desktop apps, browsers, games within reason).
 */

const SENDINPUT_HELPERS = `
$global:SendInputAssist = {
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class WinInput {
  [DllImport("user32.dll")] public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);
  [StructLayout(LayoutKind.Sequential)] public struct INPUT { public int type; public MOUSEINPUT mi; }
  [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT {
    public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo;
  }
  public const int INPUT_MOUSE = 0;
  public const uint MOUSEEVENTF_MOVE = 0x0001;
  public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
  public const uint MOUSEEVENTF_LEFTUP = 0x0004;
  public const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
  public const uint MOUSEEVENTF_RIGHTUP = 0x0010;
  public const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
  public const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
  public const uint MOUSEEVENTF_WHEEL = 0x0800;
  public const uint MOUSEEVENTF_ABSOLUTE = 0x8000;
}
'@
}
`;

export interface InputArgs {
  action?: string; // mouse_move, mouse_click, double_click, right_click, drag, scroll, hover
  x?: number;
  y?: number;
  button?: string;
  amount?: number;
  text?: string; // for type_text
  keys?: string; // for press_keys
}

export async function mouseInput(args: InputArgs): Promise<{ executed: boolean; action: string; message: string }> {
  const action = String(args.action || "mouse_click").toLowerCase().trim();
  const screenW = 1920;
  const screenH = 1080;

  try {
    switch (action) {
      case "mouse_move":
      case "hover": {
        const abs = toAbsolute(args.x ?? 0, args.y ?? 0, screenW, screenH);
        await sendMouse(`${abs.x},${abs.y}`, "absolute_move");
        return { executed: true, action, message: `Moved mouse to (${args.x}, ${args.y}).` };
      }
      case "mouse_click":
      case "click": {
        const abs = toAbsolute(args.x ?? 0, args.y ?? 0, screenW, screenH);
        await sendMouse(`${abs.x},${abs.y}`, "absolute_move");
        await sendMouse("", "left_click");
        return { executed: true, action, message: `Clicked at (${args.x}, ${args.y}).` };
      }
      case "double_click": {
        const abs = toAbsolute(args.x ?? 0, args.y ?? 0, screenW, screenH);
        await sendMouse(`${abs.x},${abs.y}`, "absolute_move");
        await sendMouse("", "left_click");
        await runPowerShell("Start-Sleep -Milliseconds 80", 3000);
        await sendMouse("", "left_click");
        return { executed: true, action, message: `Double-clicked at (${args.x}, ${args.y}).` };
      }
      case "right_click": {
        const abs = toAbsolute(args.x ?? 0, args.y ?? 0, screenW, screenH);
        await sendMouse(`${abs.x},${abs.y}`, "absolute_move");
        await sendMouse("", "right_click");
        return { executed: true, action, message: `Right-clicked at (${args.x}, ${args.y}).` };
      }
      case "scroll": {
        const amt = clamp(args.amount ?? 3, -20, 20);
        await sendMouse(String(Math.round(amt * 120)), "wheel");
        return { executed: true, action, message: `Scrolled ${amt > 0 ? "down" : "up"} by ${Math.abs(amt)} notches.` };
      }
      default:
        return { executed: false, action, message: `Unknown mouse action: ${action}` };
    }
  } catch (e: any) {
    return { executed: false, action, message: `Mouse input failed: ${e?.message || e}` };
  }
}

export async function keyboardInput(args: InputArgs): Promise<{ executed: boolean; action: string; message: string }> {
  const action = String(args.action || "type_text").toLowerCase().trim();
  try {
    switch (action) {
      case "type_text": {
        const text = String(args.text ?? "");
        await sendKeysText(text);
        return { executed: true, action, message: `Typed ${text.length} character${text.length === 1 ? "" : "s"}.` };
      }
      case "press_keys":
      case "press_shortcut": {
        const keys = String(args.keys ?? "");
        if (!keys) return { executed: false, action, message: "No keys specified." };
        await sendKeysCombo(keys);
        return { executed: true, action, message: `Sent keystroke ${keys}.` };
      }
      default:
        return { executed: false, action, message: `Unknown keyboard action: ${action}` };
    }
  } catch (e: any) {
    return { executed: false, action, message: `Keyboard input failed: ${e?.message || e}` };
  }
}

/** Resolve pixel coords to absolute 0..65535 for SendInput MOUSEEVENTF_ABSOLUTE. */
function toAbsolute(x: number, y: number, w: number, h: number) {
  const ax = Math.round((x / w) * 65535);
  const ay = Math.round((y / h) * 65535);
  return { x: clamp(ax, 0, 65535), y: clamp(ay, 0, 65535) };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Drive the global WinInput helper (loaded once per session) for a mouse op. */
async function sendMouse(coord: string, op: "absolute_move" | "left_click" | "right_click" | "wheel"): Promise<void> {
  let body = "";
  const helper = ensureHelper();
  if (op === "absolute_move") {
    const [x, y] = coord.split(",").map(Number);
    body = `
& $global:SendInputAssist
$i = New-Object WinInput+INPUT
$i.type = [WinInput]::INPUT_MOUSE
$i.mi.dx = ${x}; $i.mi.dy = ${y}
$i.mi.dwFlags = [WinInput]::MOUSEEVENTF_MOVE -bor [WinInput]::MOUSEEVENTF_ABSOLUTE
[WinInput]::SendInput(1, @($i), [System.Runtime.InteropServices.Marshal]::SizeOf($i)) | Out-Null
`;
  } else if (op === "left_click") {
    body = clickBody("LEFTDOWN", "LEFTUP");
  } else if (op === "right_click") {
    body = clickBody("RIGHTDOWN", "RIGHTUP");
  } else if (op === "wheel") {
    body = `
& $global:SendInputAssist
$i = New-Object WinInput+INPUT
$i.type = [WinInput]::INPUT_MOUSE
$i.mi.mouseData = ${coord}
$i.mi.dwFlags = [WinInput]::MOUSEEVENTF_WHEEL
[WinInput]::SendInput(1, @($i), [System.Runtime.InteropServices.Marshal]::SizeOf($i)) | Out-Null
`;
  }
  await runPowerShell(helper + body, 8000);
}

function clickBody(down: string, up: string): string {
  return `
& $global:SendInputAssist
$d = New-Object WinInput+INPUT
$d.type = [WinInput]::INPUT_MOUSE
$d.mi.dwFlags = [WinInput]::MOUSEEVENTF_${down}
[WinInput]::SendInput(1, @($d), [System.Runtime.InteropServices.Marshal]::SizeOf($d)) | Out-Null
Start-Sleep -Milliseconds 40
$u = New-Object WinInput+INPUT
$u.type = [WinInput]::INPUT_MOUSE
$u.mi.dwFlags = [WinInput]::MOUSEEVENTF_${up}
[WinInput]::SendInput(1, @($u), [System.Runtime.InteropServices.Marshal]::SizeOf($u)) | Out-Null
`;
}

function ensureHelper(): string {
  return SENDINPUT_HELPERS;
}

/** Type arbitrary text via SendKeys (literal characters). */
async function sendKeysText(text: string): Promise<void> {
  // Escape SendKeys special chars by wrapping in {+...} is unreliable; use WScript.Shell SendKeys with care.
  // For robustness we encode special characters {{ }} etc.
  const safe = text
    .replace(/\+/g, "{+}")
    .replace(/\^/g, "{^}")
    .replace(/%/g, "{%}")
    .replace(/~/g, "{~}")
    .replace(/\(/g, "{(}")
    .replace(/\)/g, "{)}")
    .replace(/\[/g, "{[}")
    .replace(/\]/g, "{]}");
  const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait('${safe.replace(/'/g, "''")}')
`;
  await runPowerShell(script, 10000);
}

/** Send a key combo like "ctrl+c", "alt+tab", "win+d". */
async function sendKeysCombo(combo: string): Promise<void> {
  // SendKeys expects e.g. "^c" (ctrl), "%{F4}" (alt+F4). Map a friendly form.
  const parts = combo.toLowerCase().split("+").map((s) => s.trim());
  const map: Record<string, string> = {
    ctrl: "^",
    control: "^",
    alt: "%",
    shift: "+",
    win: "^ESC", // SendKeys can't do Win directly; handled separately for common combos
    esc: "{ESC}",
    enter: "{ENTER}",
    tab: "{TAB}",
    space: " ",
    backspace: "{BS}",
    delete: "{DEL}",
    up: "{UP}",
    down: "{DOWN}",
    left: "{LEFT}",
    right: "{RIGHT}",
    home: "{HOME}",
    end: "{END}",
  };

  // Win+letter combos route through nircmd for reliability.
  if (parts.includes("win") && parts.length === 2) {
    const letter = parts.find((p) => !["win", "ctrl", "alt", "shift"].includes(p)) || "";
    const { runNircmd } = await import("./nircmd");
    await runNircmd(["sendkeypress", `win+${letter}`]);
    return;
  }

  let out = "";
  let suffix = "";
  for (const p of parts) {
    if (map[p]) {
      if (["^", "%", "+"].includes(map[p])) out += map[p];
      else suffix += map[p];
    } else if (/^f\d{1,2}$/.test(p)) {
      suffix += `{${p.toUpperCase()}}`;
    } else if (p.length === 1) {
      suffix += p;
    } else {
      suffix += p;
    }
  }
  const final = out + suffix;
  const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait('${final.replace(/'/g, "''")}')
`;
  await runPowerShell(script, 8000);
}
