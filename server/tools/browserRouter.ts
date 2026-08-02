import { exec } from "child_process";
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

export async function detectSystemDefaultBrowser(): Promise<SystemBrowserInfo> {
  return { name: "Google Chrome", isDetected: true };
}

export function determineBrowserTarget(
  intentOrUrl: string,
  toolName?: string,
  userMode: BrowserRoutingMode = "system_default"
): BrowserTargetDecision {
  return {
    target: "system_default",
    reason: "Standard user browsing/search request routes to System Default Browser",
  };
}

/**
 * Open a URL in the user's OS system default browser (Chrome/Edge/Firefox).
 * Uses direct shell invocation (`start <url>` on Windows, `open <url>` on macOS, `xdg-open` on Linux).
 */
export async function launchSystemDefaultBrowser(
  url: string
): Promise<{ success: boolean; message: string; offerSandboxFallback?: boolean }> {
  let formattedUrl = url.trim();
  if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://") && !formattedUrl.startsWith("file://")) {
    formattedUrl = "https://" + formattedUrl;
  }

  const platform = os.platform();

  try {
    if (platform === "win32") {
      await new Promise<void>((resolve, reject) => {
        // Direct Windows shell launch — opens URL as a new tab in active Chrome window
        exec(`start "" "${formattedUrl}"`, (err) => {
          if (err) {
            // Fallback: start without quotes
            exec(`start ${formattedUrl}`, (err2) => {
              if (err2) reject(err2);
              else resolve();
            });
          } else {
            resolve();
          }
        });
      });
    } else if (platform === "darwin") {
      await execAsync(`open "${formattedUrl}"`);
    } else {
      await execAsync(`xdg-open "${formattedUrl}"`);
    }
    return { success: true, message: `Opened ${formattedUrl} in System Default Browser.` };
  } catch (err: any) {
    console.error("[browserRouter] Error launching browser:", err);
    return {
      success: false,
      message: `Could not launch browser for ${formattedUrl}.`,
      offerSandboxFallback: true,
    };
  }
}
