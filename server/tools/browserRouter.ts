import { exec, execFile } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

export type BrowserRoutingMode =
  | "system_default"
  | "always_ask"
  | "always_sandbox"
  | "always_default";

export interface BrowserTargetDecision {
  target: "system_default" | "sandbox" | "ask_user";
  reason: string;
  url?: string;
}

export interface SystemBrowserInfo {
  name: string;
  executableName?: string;
  isDetected: boolean;
}

/**
 * Detect the operating system's configured default browser.
 * Supports Windows (Registry), macOS (defaultbrowser/plist), and Linux (xdg-settings).
 */
export async function detectSystemDefaultBrowser(): Promise<SystemBrowserInfo> {
  const platform = os.platform();

  if (platform === "win32") {
    try {
      // Query Windows UserChoice ProgID for http protocol
      const { stdout } = await execAsync(
        `reg query "HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice" /v ProgId`
      );
      const match = /ProgId\s+REG_SZ\s+(\S+)/i.exec(stdout);
      if (match && match[1]) {
        const progId = match[1].toLowerCase();
        if (progId.includes("chrome")) return { name: "Google Chrome", executableName: "chrome.exe", isDetected: true };
        if (progId.includes("msedge") || progId.includes("edge")) return { name: "Microsoft Edge", executableName: "msedge.exe", isDetected: true };
        if (progId.includes("firefox")) return { name: "Mozilla Firefox", executableName: "firefox.exe", isDetected: true };
        if (progId.includes("brave")) return { name: "Brave Browser", executableName: "brave.exe", isDetected: true };
        if (progId.includes("opera")) return { name: "Opera Browser", executableName: "opera.exe", isDetected: true };
        if (progId.includes("arc")) return { name: "Arc Browser", executableName: "arc.exe", isDetected: true };
        if (progId.includes("vivaldi")) return { name: "Vivaldi Browser", executableName: "vivaldi.exe", isDetected: true };
        return { name: `Default Browser (${match[1]})`, isDetected: true };
      }
    } catch (e) {
      console.warn("[browserRouter] Windows default browser registry lookup notice:", e);
    }
    return { name: "Windows System Default Browser", isDetected: true };
  }

  if (platform === "darwin") {
    try {
      const { stdout } = await execAsync(`defaults read com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers`);
      if (stdout.includes("google.chrome")) return { name: "Google Chrome", isDetected: true };
      if (stdout.includes("safari")) return { name: "Apple Safari", isDetected: true };
      if (stdout.includes("firefox")) return { name: "Mozilla Firefox", isDetected: true };
    } catch (_) {}
    return { name: "macOS Default Browser (Safari/Chrome)", isDetected: true };
  }

  if (platform === "linux") {
    try {
      const { stdout } = await execAsync(`xdg-settings get default-web-browser`);
      const browserFile = stdout.trim().toLowerCase();
      if (browserFile.includes("chrome")) return { name: "Google Chrome", isDetected: true };
      if (browserFile.includes("firefox")) return { name: "Mozilla Firefox", isDetected: true };
      if (browserFile.includes("brave")) return { name: "Brave Browser", isDetected: true };
      return { name: `Linux Default (${stdout.trim()})`, isDetected: true };
    } catch (_) {}
    return { name: "Linux System Default Browser", isDetected: true };
  }

  return { name: "System Default Browser", isDetected: false };
}

/**
 * Intelligent Intent Classifier for Browser Requests
 * Determines whether a user prompt / tool call should use System Default Browser or AI Sandbox.
 */
export function determineBrowserTarget(
  intentOrUrl: string,
  toolName?: string,
  userMode: BrowserRoutingMode = "system_default"
): BrowserTargetDecision {
  const text = intentOrUrl.toLowerCase().trim();

  // Mode Overrides
  if (userMode === "always_sandbox") {
    return { target: "sandbox", reason: "User preference set to Always Sandbox" };
  }
  if (userMode === "always_default") {
    return { target: "system_default", reason: "User preference set to Always System Default" };
  }
  if (userMode === "always_ask") {
    return { target: "ask_user", reason: "User preference set to Always Ask" };
  }

  // 1. Check for Explicit Sandbox Requests
  const explicitSandboxKeywords = [
    "in sandbox",
    "use sandbox",
    "use ai browser",
    "browse privately in sandbox",
    "test website in sandbox",
    "test in sandbox",
    "sandbox browser",
    "isolated browser",
  ];
  if (explicitSandboxKeywords.some((kw) => text.includes(kw))) {
    return { target: "sandbox", reason: "Explicit user request for sandbox browser" };
  }

  // 2. Check Tool Name
  if (toolName === "browser_navigate" || toolName === "browser_sandbox_exec" || toolName === "autonomous_browse") {
    return { target: "sandbox", reason: "Autonomous multi-step AI workflow tool" };
  }

  // 3. Check for AI Automation / Scraping / Multi-step intent keywords
  const aiAutomationKeywords = [
    "scrape",
    "web scraping",
    "fill form automatically",
    "auto fill",
    "cookie isolation",
    "multi-tab automation",
    "session isolation",
    "preview generated webpage",
    "workflow automation",
  ];
  if (aiAutomationKeywords.some((kw) => text.includes(kw))) {
    return { target: "sandbox", reason: "Autonomous AI automation or scraping task" };
  }

  // 4. Default Rule: Standard Browsing ALWAYS uses System Default Browser
  return {
    target: "system_default",
    reason: "Standard user browsing/search request routes to System Default Browser",
  };
}

/**
 * Open a URL in the user's OS system default browser with robust 2-tier retry fallback.
 * Never silently switches to sandbox!
 */
export async function launchSystemDefaultBrowser(
  url: string
): Promise<{ success: boolean; message: string; offerSandboxFallback?: boolean }> {
  let formattedUrl = url.trim();
  if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://") && !formattedUrl.startsWith("file://")) {
    formattedUrl = "https://" + formattedUrl;
  }

  const platform = os.platform();

  // Tier 1: Primary OS Command via PowerShell Start-Process (handles & query params safely)
  try {
    if (platform === "win32") {
      const safePw = formattedUrl.replace(/'/g, "''");
      await new Promise<void>((resolve, reject) => {
        execFile("powershell.exe", ["-NoProfile", "-Command", `Start-Process '${safePw}'`], { windowsHide: true }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } else if (platform === "darwin") {
      await execAsync(`open "${formattedUrl}"`);
    } else {
      await execAsync(`xdg-open "${formattedUrl}"`);
    }
    return { success: true, message: `Opened ${formattedUrl} in System Default Browser.` };
  } catch (err1) {
    console.warn("[browserRouter] Primary launch failed, attempting Tier 2 fallback:", err1);
  }

  // Tier 2: CMD start with explicit double-quoted URL fallback (Windows)
  try {
    if (platform === "win32") {
      const safeCmdUrl = formattedUrl.replace(/&/g, "^&");
      await execAsync(`cmd.exe /c start "" "${formattedUrl}"`);
      return { success: true, message: `Opened ${formattedUrl} in System Default Browser via CMD.` };
    }
  } catch (err2) {
    console.warn("[browserRouter] Tier 2 launch failed:", err2);
  }

  // Failed both attempts — return clear failure notice, NEVER silently switch to sandbox!
  return {
    success: false,
    message: `Could not launch system default browser for ${formattedUrl}.`,
    offerSandboxFallback: true,
  };
}
