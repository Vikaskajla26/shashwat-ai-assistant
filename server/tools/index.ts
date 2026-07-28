import { MemoryManager, MemoryCategory } from "./memory";
import { classifyRisk, confirmationRequiredResponse } from "./safety";
import { launchApp, openInDefaultBrowser } from "./apps";
import { resolveFirstYouTubeVideo, buildWatchUrl } from "./youtube";
import { systemControl, mediaControl } from "./system";
import { fileOperation } from "./files";
import { mouseInput, keyboardInput } from "./input";
import { browserNavigate, sandboxExec } from "./browser";
import { getSystemInfo } from "./systemInfo";
import { getVoiceprint, deleteVoiceprint, enrollVoiceprint } from "../voice/speakerVerification";
import { KnowledgeIndex } from "../docIntel/knowledgeIndex";
import { StudyGenerator } from "../docIntel/studyGenerator";
import { analyzeSanskritShloka, evaluateSanskritRecitation } from "./sanskritChant";
import { fetchLiveSearchResults } from "./liveSearchFetcher";
import { withRetry, logOutcome, type RecoveryFixer } from "../registry/recovery";
import { analyzeError } from "../selfLearningEngine";
import { recordError } from "../registry/errorIntelStore";

/**
 * Central tool executor. Runs REAL actions on the OS, applies the safety
 * (confirmation) layer, and returns the response object that gets sent back
 * to Gemini. UI-only tools (changeAssistantMood, showVisualCard) are flagged
 * via `clientSide: true` so the server forwards them to the browser instead.
 *
 * Every execution is timed, recorded into the metrics store, and retried with
 * recovery on transient failures — so the Task Health Dashboard reflects what
 * actually happens, not seed data.
 */

const memory = new MemoryManager();

/**
 * Verified-fix handlers keyed by problem key. When `withRetry` hits a known
 * error (e.g. Playwright's missing Chromium binary), the matching fixer runs
 * BEFORE the retry — a real alternate strategy instead of a blind re-attempt.
 */
const RECOVERY_FIXERS: Record<string, RecoveryFixer> = {
  // "Executable doesn't appear at .../chrome-win64-*/chrome-win64/chrome.exe"
  // → install the browser once, then let the retry succeed.
  async BrowserNotFoundError(_key: string) {
    return installPlaywrightChromium();
  },
};

let playwrightInstallInFlight: Promise<boolean> | null = null;
async function installPlaywrightChromium(): Promise<boolean> {
  // Guard against re-entrant installs (retries could otherwise stack downloads).
  if (playwrightInstallInFlight) return playwrightInstallInFlight;
  playwrightInstallInFlight = (async () => {
    try {
      const { execFile } = await import("child_process");
      await new Promise<void>((resolve, reject) => {
        execFile(
          process.platform === "win32" ? "npx.cmd" : "npx",
          ["playwright", "install", "chromium"],
          { windowsHide: true, timeout: 120000 },
          (err) => (err ? reject(err) : resolve())
        );
      });
      return true;
    } catch (e) {
      console.warn("[recovery] playwright install chromium failed:", e);
      return false;
    } finally {
      playwrightInstallInFlight = null;
    }
  })();
  return playwrightInstallInFlight;
}

export interface ToolEvent {
  /** Short human-readable status line for the on-screen event log. */
  statusLine: string;
  /** Optional card to show in the UI overlay. */
  card?: { title: string; content: string; category?: string; url?: string };
  /** True for mood/card tools that must execute in the browser. */
  clientSide?: boolean;
}

export interface ExecuteResult {
  /** The response sent back to Gemini as the function result. */
  response: Record<string, any>;
  /** Metadata for the UI (event log + optional card). */
  event: ToolEvent;
}

const CLIENT_SIDE_TOOLS = new Set([
  "changeAssistantMood",
  "showVisualCard",
  "enroll_voice_profile",
  "open_document_workspace",
  "open_sanskrit_chant_studio",
]);

export function isClientSideTool(name: string): boolean {
  return CLIENT_SIDE_TOOLS.has(name);
}

export async function executeTool(
  name: string,
  args: Record<string, any>,
  speakerState?: { status: string; confidence: number; ownerName: string }
): Promise<ExecuteResult> {
  const argsSafe = args || {};
  const timestamp = new Date().toLocaleTimeString();

  // ---- Speaker Security Gating for Unknown / Guest Voices ----
  if (speakerState && speakerState.status === "UNKNOWN_SPEAKER") {
    const RESTRICTED_TOOLS = new Set([
      "remember_fact",
      "retrieve_memory",
      "forget_memory",
      "get_memory_summary",
      "file_operation",
      "delete_voice_profile",
      "system_control",
    ]);

    if (RESTRICTED_TOOLS.has(name)) {
      console.warn(`[SpeakerSecurity] BLOCKED ${name} for UNKNOWN_SPEAKER (${Math.round((speakerState.confidence || 0) * 100)}% match)`);
      return fail(
        name,
        `SECURITY LOCK: Speaker voice unrecognized (${Math.round((speakerState.confidence || 0) * 100)}% match). Personal memories, file operations, and system tools are strictly locked to verified owner ${speakerState.ownerName}.`
      );
    }
  }

  // ---- Safety gate for HIGH-risk actions ----
  const risk = classifyRisk(name, argsSafe);
  if (risk.level === "HIGH" && !argsSafe.confirmed) {
    const response = confirmationRequiredResponse(name, argsSafe, risk.question || "Are you sure?");
    return {
      response,
      event: {
        statusLine: `Confirmation required: ${name}`,
        card: {
          title: "Confirmation required",
          content: `🔒 ${response.question}`,
          category: "Safety",
        },
      },
    };
  }

  // ---- Timed dispatch with retry + recovery + telemetry ----
  // The actual switch runs inside withRetry(); safety/speaker/client-side gates
  // stay OUTSIDE retry (never retried, never double-confirmed). Every outcome is
  // recorded so the health dashboard and confidence scores reflect reality.
  const startedAtIso = new Date().toISOString();
  const t0 = performance.now();
  let retryMeta = { recoveryTried: false, recoverySucceeded: false };

  try {
    const dispatch = async (): Promise<ExecuteResult> => {
      switch (name) {
      // ---------------- Memory ----------------
      case "remember_fact": {
        const category = (argsSafe.category || "personal") as MemoryCategory;
        const importance = argsSafe.importance || "HIGH";
        const fact = memory.rememberFact(
          category,
          argsSafe.key || "Fact",
          argsSafe.value || "",
          importance
        );
        const saved = importance !== "LOW";
        return ok(
          saved
            ? { remembered: true, fact, message: `Remembered [${importance}] ${category}: ${fact.key}` }
            : { remembered: false, message: `Skipped LOW importance memory: ${argsSafe.key}` },
          saved ? `Memory saved: ${fact.key}` : `Memory skipped (LOW): ${argsSafe.key}`,
          saved
            ? {
                title: `Memory Stored (${importance}): ${fact.key}`,
                content: `**Category:** ${category}\n\n**Detail:** ${fact.value}`,
                category: "Long-term Memory",
              }
            : undefined
        );
      }
      case "retrieve_memory": {
        const items = memory.retrieveMemory(argsSafe.query, argsSafe.category);
        return ok(
          { count: items.length, memories: items },
          `Retrieved ${items.length} memories`
        );
      }
      case "forget_memory": {
        const success = memory.forgetMemory(argsSafe.key, argsSafe.category, argsSafe.clear_all);
        const msg = argsSafe.clear_all
          ? "All long-term memories cleared."
          : argsSafe.key
          ? `Forgot memory: "${argsSafe.key}"`
          : `Cleared category: ${argsSafe.category}`;
        return ok(
          { success, message: msg },
          msg,
          { title: "Memory Erased", content: `🗑️ ${msg}`, category: "Memory Control" }
        );
      }
      case "get_memory_summary": {
        const all = memory.getAllMemories();
        return ok({ total: all.length, memories: all }, `Memory summary (${all.length} items)`);
      }

      // ---------------- Document Intelligence & AI Research ----------------
      case "query_knowledge_base": {
        const ki = KnowledgeIndex.getInstance();
        const res = ki.queryKnowledgeBase(argsSafe.query || "", argsSafe.doc_id);
        return ok(
          res,
          `Searched knowledge base: "${argsSafe.query}" (${res.citations.length} citations found)`,
          {
            title: `Document Research: "${argsSafe.query}"`,
            content: `${res.answer.slice(0, 300)}...\n\n**Citations:** ${res.citations.map((c) => `[${c.docName}, Pg ${c.pageNumber}]`).join(', ')}`,
            category: "Document Intelligence",
          }
        );
      }
      case "analyze_document": {
        const ki = KnowledgeIndex.getInstance();
        const res = ki.queryKnowledgeBase(argsSafe.focus_area || "executive summary", argsSafe.doc_id);
        return ok(
          res,
          `Analyzed document ${argsSafe.doc_id || 'workspace'}`,
          {
            title: `Document Analysis (${argsSafe.focus_area || "Summary"})`,
            content: res.answer.slice(0, 350) + '...',
            category: "Document Intelligence",
          }
        );
      }
      case "generate_study_materials": {
        const study = StudyGenerator.generateStudyMaterials(argsSafe.doc_id);
        return ok(
          study,
          `Generated study materials (${study.mcqs.length} MCQs, ${study.flashcards.length} Flashcards)`,
          {
            title: `Study Tools Ready: ${study.docName}`,
            content: `Generated ${study.mcqs.length} MCQs, ${study.flashcards.length} Flashcards, and Mind Map diagram for ${study.docName}.`,
            category: "Study Intelligence",
          }
        );
      }
      case "compare_documents": {
        const ki = KnowledgeIndex.getInstance();
        const comp = ki.compareDocuments(argsSafe.doc_ids);
        return ok(
          comp,
          `Compared ${comp.filesCompared.length} workspace documents`,
          {
            title: `Multi-Document Comparison (${comp.filesCompared.length} Files)`,
            content: comp.synthesis,
            category: "Document Research",
          }
        );
      }

      // ---------------- Browser / Web ----------------
      case "open_website":
      case "openWebsite": {
        let url = argsSafe.url || "https://google.com";
        if (!/^https?:\/\//i.test(url)) url = "https://" + url;
        await openInDefaultBrowser(url);
        return ok(
          { opened: true, url, message: `Opened ${url} in the default browser.` },
          `Opening ${url}`,
          { title: `Browser: ${argsSafe.site_name || "Website"}`, content: `Opening ${url}`, category: "Browser", url }
        );
      }
      case "searchGoogle": {
        const queryStr = String(argsSafe.query || "").trim();
        const url = `https://www.google.com/search?q=${encodeURIComponent(queryStr)}`;
        const { directAnswer, summaryText, openedIn } = await liveGoogleSearch(queryStr, url);
        const instruction = `CRITICAL INSTRUCTION FOR VOICE RESPONSE: The user asked a real-time factual question ("${queryStr}"). The current live Google search results above provide the latest accurate facts. You MUST speak the current live answer in your spoken voice response. Do NOT state older pre-trained historical figures or past directors.`;

        return ok(
          {
            searched: true,
            query: queryStr,
            url,
            openedIn, // "sandbox" | "default_browser" — single visible window
            CURRENT_FACTUAL_ANSWER_TO_SPEAK: directAnswer || summaryText,
            liveTextSummary: summaryText,
            instruction,
          },
          `Google search: ${queryStr}`,
          {
            title: "Google Live Search (Playwright)",
            content: summaryText || `Searching "${queryStr}"`,
            category: "Web Search",
            url,
          }
        );
      }
      case "searchYouTube": {
        const queryStr = argsSafe.query || "trending music";
        const isMusic = queryStr.toLowerCase().includes("music") || queryStr.toLowerCase().includes("song");
        const url = isMusic
          ? `https://music.youtube.com/search?q=${encodeURIComponent(queryStr)}`
          : `https://www.youtube.com/results?search_query=${encodeURIComponent(queryStr)}`;
        await openInDefaultBrowser(url);
        return ok(
          { searched: true, query: queryStr, url },
          `YouTube search for ${queryStr}`,
          { title: "YouTube Media", content: `▶️ Playing ${queryStr} on YouTube`, category: "Media Search", url }
        );
      }
      case "playFirstVideo": {
        const queryStr = argsSafe.query || "top songs";
        const match = await resolveFirstYouTubeVideo(queryStr);
        const url = match ? buildWatchUrl(match.videoId) : `https://www.youtube.com/results?search_query=${encodeURIComponent(queryStr)}`;
        await openInDefaultBrowser(url);
        const playing = Boolean(match);
        return ok(
          {
            executed: true,
            query: queryStr,
            url,
            matchedVideo: playing,
            videoTitle: match?.title,
            message: playing
              ? `Now playing "${match?.title || queryStr}" on YouTube in your default browser. Say pause, play, next, or volume up/down to control it.`
              : `Couldn't resolve an exact video match — opened YouTube search results for "${queryStr}" instead.`,
          },
          `YouTube: ${queryStr}`,
          {
            title: "YouTube Player",
            content: playing ? `🎵 Playing ${match?.title || queryStr}` : `🔍 Search results for ${queryStr}`,
            category: "Media",
            url,
          }
        );
      }
      case "search_web": {
        // GOOGLE-ONLY BY DESIGN: only Google and Google-owned properties are
        // offered here (web, images, news are all google.com/news.google.com;
        // youtube is Google-owned). Third-party engines (Wikipedia, Stack
        // Overflow) have been removed — anything not explicitly Google falls
        // back to a plain Google search instead.
        const requestedEngine = String(argsSafe.engine || "google").toLowerCase();
        const GOOGLE_ENGINES = new Set(["google", "youtube", "images", "news"]);
        const engine = GOOGLE_ENGINES.has(requestedEngine) ? requestedEngine : "google";
        const queryStr = String(argsSafe.query || "").trim();
        const q = encodeURIComponent(queryStr);
        const map: Record<string, string> = {
          google: `https://www.google.com/search?q=${q}`,
          youtube: `https://www.youtube.com/results?search_query=${q}`,
          images: `https://www.google.com/search?tbm=isch&q=${q}`,
          news: `https://news.google.com/search?q=${q}`,
        };
        const url = map[engine] || map.google;

        // For the Google engine, use the shared live-search helper (single visible
        // window). Other Google-owned engines just open the default browser — no scraping.
        let directAnswer = "";
        let summaryText = "";
        let openedIn: "default_browser" = "default_browser";
        if (engine === "google") {
          const live = await liveGoogleSearch(queryStr, url);
          directAnswer = live.directAnswer;
          summaryText = live.summaryText;
          openedIn = live.openedIn;
        } else {
          await openInDefaultBrowser(url);
        }

        const instruction = `CRITICAL INSTRUCTION FOR VOICE RESPONSE: The user asked a real-time factual question ("${queryStr}"). The current live Google search results above provide the latest accurate facts. You MUST speak the current live answer in your spoken voice response. Do NOT state older pre-trained historical figures or past directors.`;

        return ok(
          {
            searched: true,
            query: queryStr,
            engine,
            url,
            openedIn,
            CURRENT_FACTUAL_ANSWER_TO_SPEAK: directAnswer || summaryText,
            liveTextSummary: summaryText,
            instruction,
          },
          `${engine}: ${queryStr}`,
          {
            title: `${engine} Live Search (Playwright)`,
            content: summaryText || `Searching "${queryStr}"`,
            category: "Web Search",
            url,
          }
        );
      }

      // ---------------- App launch ----------------
      case "launch_app":
      case "launchApplication": {
        const appName = String(argsSafe.app_name || argsSafe.appName || "").trim();
        if (!appName) return fail(name, "No app name provided.");
        const r = await launchApp(appName);
        return ok(
          r,
          r.launched ? `Launched ${appName}` : `Could not launch ${appName}`,
          {
            title: r.launched ? `Launched: ${appName}` : `Not found: ${appName}`,
            content: r.message,
            category: "App Control",
          }
        );
      }

      // ---------------- System control ----------------
      case "system_control": {
        const r = await systemControl(argsSafe.action, argsSafe.level);
        return ok(r, r.message, { title: "System Control", content: `⚡ ${r.message}`, category: "OS Action" });
      }

      // ---------------- Media control ----------------
      case "media_control": {
        const r = await mediaControl(argsSafe.command);
        return ok(r, r.message, { title: "Media Controller", content: `🎵 ${r.message}`, category: "Media" });
      }

      // ---------------- File operations ----------------
      case "file_operation": {
        const r: any = await fileOperation({
          action: argsSafe.action,
          target_name: argsSafe.target_name,
          content: argsSafe.content,
          path: argsSafe.path,
          destination: argsSafe.destination,
        });
        // Attach content/entries/results onto the response for the model.
        return ok(r, r.message, {
          title: "File System",
          content: `📁 ${r.message}`,
          category: "Storage",
        });
      }

      // ---------------- Input automation ----------------
      case "mouse_input": {
        const r = await mouseInput(argsSafe as any);
        return ok(r, r.message, { title: "Mouse Input", content: `🖱️ ${r.message}`, category: "Input" });
      }
      case "keyboard_input": {
        const r = await keyboardInput(argsSafe as any);
        return ok(r, r.message, { title: "Keyboard Input", content: `⌨️ ${r.message}`, category: "Input" });
      }

      // ---------------- Browser automation ----------------
      case "browser_navigate": {
        const r = await browserNavigate(argsSafe as any);
        return ok(r, r.message, {
          title: `Browser: ${r.action}`,
          content: r.data ? JSON.stringify(r.data).slice(0, 400) : r.message,
          category: "Smart Browser",
        });
      }
      case "browser_sandbox_exec": {
        const r = await sandboxExec(argsSafe as any);
        return ok(r, r.message, {
          title: `Sandbox: ${argsSafe.query}`,
          content: r.data?.summary || r.message,
          category: "Autonomous Sandbox",
        });
      }

      // ---------------- Productivity ----------------
      case "productivity_action": {
        const r = await productivityAction(argsSafe);
        return ok(r, r.message, { title: "Productivity", content: `⏱️ ${r.message}`, category: "Productivity" });
      }

      // ---------------- System info ----------------
      case "getSystemInfo": {
        const info = await getSystemInfo();
        return ok(info, "Retrieved system info");
      }

      // ---------------- Voice Identity & Biometrics ----------------
      case "get_voice_status": {
        const vp = getVoiceprint();
        if (vp) {
          return ok(
            { enrolled: true, ownerName: vp.ownerName, enrolledAt: vp.enrolledAt, samplesCount: vp.samplesCount },
            `Voice Profile Active: Registered to ${vp.ownerName}`,
            { title: "Voice Profile Active", content: `**Registered Owner:** ${vp.ownerName}\n**Enrolled:** ${vp.enrolledAt.slice(0, 10)}\n**Samples:** ${vp.samplesCount}`, category: "Voice Identity" }
          );
        } else {
          return ok(
            { enrolled: false, message: "No voice profile enrolled yet. System open access." },
            "Voice Profile: Unenrolled",
            { title: "Voice Profile Status", content: "No voiceprint enrolled. Click **Enroll Voice** in Settings to set up your voice identity.", category: "Voice Identity" }
          );
        }
      }
      case "enroll_voice_profile": {
        return ok(
          { action: "open_enrollment_ui", message: "Launching Guided Voice Enrollment UI..." },
          "Guided Voice Enrollment Launched",
          { title: "Voice Enrollment", content: "Follow the on-screen steps to record your 4 voice phrases.", category: "Voice Identity" },
          true
        );
      }
      case "delete_voice_profile": {
        const deleted = deleteVoiceprint();
        return ok(
          { deleted, message: deleted ? "Voice profile deleted." : "Failed to delete voice profile." },
          deleted ? "Voice Profile Reset" : "Voice Profile Reset Failed",
          { title: "Voice Profile Reset", content: "Your stored voiceprint vector has been permanently deleted.", category: "Voice Identity" }
        );
      }

      // ---------------- Sanskrit Chant Intelligence tools ----------------
      case "analyze_sanskrit_shloka": {
        const res = await analyzeSanskritShloka(argsSafe);
        return ok(res, `Analyzed Sanskrit Shloka: ${res.shlokaTitle}`, {
          title: `Sanskrit Analysis - ${res.shlokaTitle}`,
          content: `${res.shlokaText}\n\nMeter: ${res.matraAnalysis.detectedMeter}\nTotal Mātrās: ${res.matraAnalysis.totalMatras}\nMeaning: ${res.meaning}`,
          category: "Sanskrit Intelligence",
        });
      }

      case "evaluate_sanskrit_recitation": {
        const res = await evaluateSanskritRecitation(argsSafe as any);
        return ok(res, `Evaluated Recitation Score: ${res.evaluation.overallAccuracy}%`, {
          title: `Recitation Report - ${res.shlokaTitle}`,
          content: `Accuracy: ${res.evaluation.overallAccuracy}%\nMātrā Timing: ${res.evaluation.matraTimingScore}%\nFeedback: ${res.evaluation.encouragingFeedback}`,
          category: "Sanskrit Intelligence",
        });
      }

      // ---------------- UI tools (executed on client) ----------------
      case "changeAssistantMood":
      case "showVisualCard":
      case "open_sanskrit_chant_studio": {
        return ok(
          { forwarded: true, message: "Forwarded to UI." },
          `UI: ${name}`,
          undefined,
          true
        );
      }

      default:
        return fail(name, `Unknown tool: ${name}`);
      }
    };

    // Wrap the dispatch: retry transient failures, apply verified fixes first.
    const retried = await withRetry<ExecuteResult>(name, argsSafe, dispatch, {
      fixers: RECOVERY_FIXERS,
    });
    retryMeta = retried;

    // Telemetry: success if the result's response isn't an error status.
    const durationMs = Math.round(performance.now() - t0);
    const isSuccess = retried.result.response?.status !== "error";
    logOutcome(name, startedAtIso, durationMs, isSuccess, retryMeta);

    return retried.result;
  } catch (error: any) {
    // Failure path (after retries/recovery exhausted, or non-retryable error).
    const durationMs = Math.round(performance.now() - t0);
    logOutcome(name, startedAtIso, durationMs, false, retryMeta, error);

    // Error Intelligence: classify + persist the root cause and any recovery.
    try {
      const analyzed = analyzeError(name, error, /* userCommand */ "");
      recordError({
        taskName: name,
        logs: String(error?.message || error),
        exceptionName: analyzed.exceptionName,
        userCommand: "",
        category: analyzed.category,
        rootCauseReason: analyzed.rootCauseReason,
        suggestedFix: analyzed.suggestedFix,
        recoveryAttempted: analyzed.recoveryAttempted,
        recoverySucceeded: retryMeta.recoverySucceeded,
      });
    } catch (intelErr) {
      console.warn("[executeTool] failed to record error intelligence:", intelErr);
    }

    return fail(name, error?.message || "Tool execution failed");
  }
}

/**
 * Live Google search — ALWAYS opens in the user's REAL default system browser.
 *
 * INTELLIGENT BROWSER ROUTING: ordinary user-facing browsing/search must
 * never open the Playwright sandbox. The sandbox is a separate, explicit
 * tool (browser_navigate / browser_sandbox_exec) reserved for autonomous
 * multi-step automation, scraping, or a direct user request like "search
 * Google in sandbox". searchGoogle/search_web are plain, everyday search —
 * they must behave exactly like the user typing into their own browser.
 *
 * The live text (for the spoken answer) comes from a plain background HTTP
 * fetch that never opens any window of its own — the ONLY visible window
 * that appears is the real default browser tab opened below.
 */
async function liveGoogleSearch(
  queryStr: string,
  url: string
): Promise<{ directAnswer: string; summaryText: string; openedIn: "default_browser" }> {
  // 1. Always launch the real default browser immediately — this is the
  //    single visible surface the user sees, exactly like a normal search.
  await openInDefaultBrowser(url);

  // 2. Fetch live snippets in the background (no visible window) purely to
  //    ground the spoken/voice response in current facts.
  let directAnswer = "";
  let summaryText = "";
  try {
    const liveSearch = await fetchLiveSearchResults(queryStr);
    directAnswer = liveSearch.directAnswer || "";
    summaryText = liveSearch.summaryText || "";
  } catch (err) {
    console.warn("[liveGoogleSearch] HTTP live-search fetch notice:", err);
  }

  return { directAnswer, summaryText, openedIn: "default_browser" };
}

/** Productivity actions — open real sites/apps, persist reminders to memory. */
async function productivityAction(args: Record<string, any>): Promise<{ executed: boolean; action: string; message: string }> {
  const action = String(args.action || "").toLowerCase();
  switch (action) {
    case "open_calendar":
      await openInDefaultBrowser("https://calendar.google.com");
      return { executed: true, action, message: "Opened Calendar." };
    case "open_notes":
      await openInDefaultBrowser("https://keep.google.com");
      return { executed: true, action, message: "Opened Notes." };
    case "open_todo":
      await openInDefaultBrowser("https://todoist.com");
      return { executed: true, action, message: "Opened To-Do list." };
    case "create_reminder": {
      memory.rememberFact("habits", `Reminder: ${args.details || "Reminder"}`, String(args.details || ""), "MEDIUM");
      return { executed: true, action, message: `Reminder saved: ${args.details}` };
    }
    case "set_timer":
      return { executed: true, action, message: `Timer noted for ${args.duration_seconds || 60}s (OS-level timer API not available; use the Clock app).` };
    default:
      return { executed: false, action, message: `Unknown productivity action: ${action}` };
  }
}

function ok(
  response: Record<string, any>,
  statusLine: string,
  card?: ToolEvent["card"],
  clientSide = false
): ExecuteResult {
  return { response, event: { statusLine, card, clientSide } };
}

function fail(name: string, message: string): ExecuteResult {
  return {
    response: { status: "error", error: message, tool: name },
    event: { statusLine: `${name} failed: ${message}`, card: { title: `${name} failed`, content: message, category: "Error" } },
  };
}
