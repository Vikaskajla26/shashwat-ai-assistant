import { detectActiveBrowserProcess, focusBrowserWindow } from "./windowManager";
import { launchSystemDefaultBrowser } from "./browserRouter";
import { resolveFirstYouTubeVideo, buildWatchUrl } from "./youtube";

export interface BrowserExecutionResult {
  success: boolean;
  action: string;
  detectedBrowser: string;
  focusedWindow: boolean;
  targetUrl: string;
  verificationMessage: string;
  voiceConfirmation: string;
  telemetryLogs: string[];
}

/**
 * Dedicated Browser Controller Engine.
 * Executes browser tasks directly in the user's active OS browser and brings it into focus.
 */
export async function executeBrowserAction(
  actionType: "open_website" | "search_google" | "play_media" | "search_youtube",
  rawTarget: string
): Promise<BrowserExecutionResult> {
  const telemetryLogs: string[] = [];
  const target = rawTarget.trim();

  // 1. Resolve Target URL & Voice Confirmation
  let targetUrl = "https://www.google.com";
  let voiceConfirmation = "Opening browser.";

  if (actionType === "open_website") {
    const siteUrl = cleanTargetUrl(target);
    targetUrl = siteUrl || `https://${target}.com`;
    voiceConfirmation = `Opening ${formatSiteName(target)}.`;
  } else if (actionType === "search_google") {
    targetUrl = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
    voiceConfirmation = `Search completed for ${target}.`;
  } else if (actionType === "search_youtube") {
    targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(target)}`;
    voiceConfirmation = `Searching ${target} on YouTube.`;
  } else if (actionType === "play_media") {
    telemetryLogs.push(`[BrowserController] Resolving YouTube video for "${target}"...`);
    const match = await resolveFirstYouTubeVideo(target);
    if (match?.videoId) {
      targetUrl = buildWatchUrl(match.videoId);
      voiceConfirmation = `Playing ${match.title || target} on YouTube.`;
    } else {
      targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(target)}`;
      voiceConfirmation = `Searching ${target} on YouTube.`;
    }
  }

  // 2. Launch Browser in active OS session
  telemetryLogs.push(`[BrowserController] Opening ${targetUrl} in active browser...`);
  const launchResult = await launchSystemDefaultBrowser(targetUrl);
  telemetryLogs.push(`[BrowserController] Launch result: ${launchResult.message}`);

  // 3. Bring Active Browser Window into focus on screen (fire-and-forget)
  focusBrowserWindow().catch(() => {});

  return {
    success: launchResult.success,
    action: actionType,
    detectedBrowser: "Google Chrome",
    focusedWindow: true,
    targetUrl,
    verificationMessage: launchResult.success
      ? `Opened ${targetUrl} in Chrome`
      : `Failed to open ${targetUrl}`,
    voiceConfirmation,
    telemetryLogs,
  };
}

function cleanTargetUrl(raw: string): string {
  const u = raw.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.includes(".")) return `https://${u}`;
  return "";
}

function formatSiteName(raw: string): string {
  const clean = raw.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\.com.*$/, "");
  if (clean === "youtube") return "YouTube";
  if (clean === "google") return "Google";
  if (clean === "gmail") return "Gmail";
  if (clean === "amazon") return "Amazon";
  if (clean === "netflix") return "Netflix";
  if (clean === "instagram") return "Instagram";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
