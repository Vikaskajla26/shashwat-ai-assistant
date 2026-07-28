import { MemoryManager, MemoryCategory } from "./memory";
import { classifyRisk, confirmationRequiredResponse } from "./safety";
import { launchApp, openInDefaultBrowser } from "./apps";
import { systemControl, mediaControl } from "./system";
import { fileOperation } from "./files";
import { mouseInput, keyboardInput } from "./input";
import { browserNavigate, sandboxExec } from "./browser";
import { getSystemInfo } from "./systemInfo";
import { getVoiceprint, deleteVoiceprint, enrollVoiceprint } from "../voice/speakerVerification";
import { KnowledgeIndex } from "../docIntel/knowledgeIndex";
import { StudyGenerator } from "../docIntel/studyGenerator";
import { analyzeSanskritShloka, evaluateSanskritRecitation } from "./sanskritChant";

/**
 * Central tool executor. Runs REAL actions on the OS, applies the safety
 * (confirmation) layer, and returns the response object that gets sent back
 * to Gemini. UI-only tools (changeAssistantMood, showVisualCard) are flagged
 * via `clientSide: true` so the server forwards them to the browser instead.
 */

const memory = new MemoryManager();

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

  try {
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
        const url = `https://www.google.com/search?q=${encodeURIComponent(argsSafe.query || "")}`;
        await openInDefaultBrowser(url);
        return ok(
          { searched: true, query: argsSafe.query, url },
          `Google search: ${argsSafe.query}`,
          { title: "Google Search", content: `Searching "${argsSafe.query}"`, category: "Web Search", url }
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
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(queryStr)}`;
        await openInDefaultBrowser(url);
        return ok(
          { executed: true, query: queryStr, url, message: `Opened YouTube playback for ${queryStr}` },
          `YouTube Autoplay: ${queryStr}`,
          { title: "YouTube Player", content: `🎵 Playing ${queryStr}`, category: "Media", url }
        );
      }
      case "search_web": {
        const engine = String(argsSafe.engine || "google").toLowerCase();
        const q = encodeURIComponent(argsSafe.query || "");
        const map: Record<string, string> = {
          google: `https://www.google.com/search?q=${q}`,
          youtube: `https://www.youtube.com/results?search_query=${q}`,
          wikipedia: `https://en.wikipedia.org/wiki/Special:Search?search=${q}`,
          stackoverflow: `https://stackoverflow.com/search?q=${q}`,
          images: `https://www.google.com/search?tbm=isch&q=${q}`,
          news: `https://news.google.com/search?q=${q}`,
        };
        const url = map[engine] || map.google;
        await openInDefaultBrowser(url);
        return ok(
          { searched: true, query: argsSafe.query, engine, url },
          `${engine}: ${argsSafe.query}`,
          { title: `${engine} search`, content: `Searching "${argsSafe.query}"`, category: "Web Search", url }
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
  } catch (error: any) {
    return fail(name, error?.message || "Tool execution failed");
  }
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
