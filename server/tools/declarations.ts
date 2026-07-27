import { Type } from "@google/genai";

/**
 * Consolidated, authoritative tool declarations exposed to Gemini.
 * This is the SINGLE source of truth — server.ts builds `tools` from this list.
 * Execution lives in ToolExecutor; the browser-side ToolManager no longer
 * declares duplicate/mirror tools.
 */

export const TOOL_DECLARATIONS = [
  // ---------------- Memory ----------------
  {
    name: "remember_fact",
    description:
      "Saves or updates a personal fact, preference, project detail, or context into long-term memory with an importance score (HIGH/MEDIUM/LOW).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description:
            "Memory category: identity, preferences, projects, relationships, education, career, habits, goals, skills, important_dates, favorites, devices, conversation_history",
        },
        key: { type: Type.STRING, description: "Label or title of the memory" },
        value: { type: Type.STRING, description: "Fact to remember permanently" },
        importance: {
          type: Type.STRING,
          description:
            "HIGH (name/career/birthday/projects), MEDIUM (preferences/favorites), LOW (temporary — do not save)",
          enum: ["HIGH", "MEDIUM", "LOW"],
        },
      },
      required: ["category", "key", "value"],
    },
  },
  {
    name: "retrieve_memory",
    description: "Retrieves stored long-term memories matching a query and/or category.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search keyword" },
        category: { type: Type.STRING, description: "Category filter" },
      },
    },
  },
  {
    name: "forget_memory",
    description: "Deletes a specific memory or clears long-term memory when the user asks.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        key: { type: Type.STRING },
        category: { type: Type.STRING },
        clear_all: { type: Type.BOOLEAN },
      },
    },
  },
  {
    name: "get_memory_summary",
    description: "Returns a summary of all remembered user facts, projects, and preferences.",
    parameters: { type: Type.OBJECT, properties: {} },
  },

  // ---------------- Browser / Web (real default browser) ----------------
  {
    name: "open_website",
    description:
      "Opens a website or URL in the user's REAL default system browser (Chrome/Edge/Firefox). Reuses an existing window/tab when possible.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: "Target URL (e.g. https://youtube.com)" },
        site_name: { type: Type.STRING },
      },
      required: ["url"],
    },
  },
  {
    name: "search_web",
    description:
      "Searches Google, YouTube, Wikipedia, Stack Overflow, Images, or News in the real default browser and opens the results page.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING },
        engine: {
          type: Type.STRING,
          enum: ["google", "youtube", "wikipedia", "stackoverflow", "images", "news"],
        },
      },
      required: ["query"],
    },
  },
  {
    name: "searchGoogle",
    description: "Shorthand: searches Google for a query in the default browser.",
    parameters: {
      type: Type.OBJECT,
      properties: { query: { type: Type.STRING } },
      required: ["query"],
    },
  },
  {
    name: "searchYouTube",
    description: "Shorthand: searches YouTube for a query in the default browser.",
    parameters: {
      type: Type.OBJECT,
      properties: { query: { type: Type.STRING } },
      required: ["query"],
    },
  },
  {
    name: "playFirstVideo",
    description: "Opens YouTube search results for a query (first result is typically auto-prominent).",
    parameters: {
      type: Type.OBJECT,
      properties: { query: { type: Type.STRING } },
    },
  },

  // ---------------- App launch (real) ----------------
  {
    name: "launch_app",
    description:
      "Launches a REAL desktop application by name (e.g. Chrome, VS Code, Cursor, Spotify, Notepad, Calculator, Terminal, Word, Excel, File Explorer, Settings, Camera).",
    parameters: {
      type: Type.OBJECT,
      properties: { app_name: { type: Type.STRING } },
      required: ["app_name"],
    },
  },
  {
    name: "launchApplication",
    description: "Alias of launch_app.",
    parameters: {
      type: Type.OBJECT,
      properties: { appName: { type: Type.STRING } },
      required: ["appName"],
    },
  },

  // ---------------- System control (real via nircmd/.NET) ----------------
  {
    name: "system_control",
    description:
      "Performs REAL system/desktop commands: volume_up, volume_down, set_volume, mute, unmute, lock_computer, show_desktop, minimize_all, close_window, brightness_up, brightness_down, screenshot.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: [
            "volume_up",
            "volume_down",
            "set_volume",
            "mute",
            "unmute",
            "lock_computer",
            "show_desktop",
            "minimize_all",
            "close_window",
            "brightness_up",
            "brightness_down",
            "screenshot",
          ],
        },
        level: { type: Type.NUMBER, description: "Percentage for set_volume (0-100)" },
      },
      required: ["action"],
    },
  },

  // ---------------- Media control (real) ----------------
  {
    name: "media_control",
    description:
      "Controls REAL media playback (system media keys): play, pause, next, previous, mute, volume_up, volume_down, fullscreen, speed_up.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: {
          type: Type.STRING,
          enum: ["play", "pause", "next", "previous", "mute", "volume_up", "volume_down", "fullscreen", "speed_up"],
        },
      },
      required: ["command"],
    },
  },

  // ---------------- File operations (real fs) ----------------
  {
    name: "file_operation",
    description:
      "Performs REAL file/folder operations: open_downloads, open_documents, open_pictures, open_desktop, open_folder, create_folder, create_file, read_file, list, search, delete, move, rename. Destructive actions (delete/move/rename) require user confirmation.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: [
            "open_downloads",
            "open_documents",
            "open_pictures",
            "open_desktop",
            "open_folder",
            "create_folder",
            "create_file",
            "read_file",
            "list",
            "search",
            "delete",
            "move",
            "rename",
          ],
        },
        target_name: { type: Type.STRING, description: "File/folder name or path" },
        content: { type: Type.STRING, description: "Content for create_file" },
        destination: { type: Type.STRING, description: "Destination path for move/rename" },
        confirmed: {
          type: Type.BOOLEAN,
          description: "Set true ONLY after the user has explicitly confirmed this high-risk action.",
        },
      },
      required: ["action"],
    },
  },

  // ---------------- Input automation (real) ----------------
  {
    name: "mouse_input",
    description:
      "Performs REAL mouse input on any focused window: mouse_move, click, double_click, right_click, hover, scroll. x/y are pixel coordinates (0,0 = top-left).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: ["mouse_move", "click", "double_click", "right_click", "hover", "scroll"],
        },
        x: { type: Type.NUMBER, description: "Horizontal pixel" },
        y: { type: Type.NUMBER, description: "Vertical pixel" },
        amount: { type: Type.NUMBER, description: "Scroll notches (positive=down, negative=up)" },
      },
      required: ["action"],
    },
  },
  {
    name: "keyboard_input",
    description:
      "Performs REAL keyboard input on any focused window: type_text, press_keys. Keys use combos like ctrl+c, alt+tab, win+d, enter, f5.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["type_text", "press_keys"] },
        text: { type: Type.STRING, description: "Text to type" },
        keys: { type: Type.STRING, description: "Key combo e.g. ctrl+s, win+d, enter" },
      },
      required: ["action"],
    },
  },

  // ---------------- Browser automation (Playwright sandbox) ----------------
  {
    name: "browser_navigate",
    description:
      "Drives शाश्वत's autonomous sandbox browser (Playwright Chromium) for real DOM operations: navigate, click, scroll, fill_form, read_page, summarize_page, compare_products, research_topic, switch_tab, close_tab, download_file, video_control. Returns REAL page text/data.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: [
            "navigate",
            "click",
            "scroll",
            "fill_form",
            "read_page",
            "summarize_page",
            "compare_products",
            "research_topic",
            "switch_tab",
            "close_tab",
            "download_file",
            "video_control",
          ],
        },
        target: { type: Type.STRING, description: "URL, selector, or visible text" },
        details: { type: Type.STRING, description: "Form inputs 'sel=>value; sel=>value', or scroll amount" },
      },
      required: ["action"],
    },
  },
  {
    name: "browser_sandbox_exec",
    description:
      "Runs an autonomous multi-tab research/comparison task in शाश्वत's sandbox browser and returns real structured findings.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING },
        task_type: {
          type: Type.STRING,
          enum: ["research", "compare_products", "extract_page", "automated_workflow"],
        },
        mode: { type: Type.STRING, enum: ["general", "research", "shopping", "email", "calendar"] },
      },
      required: ["query"],
    },
  },

  // ---------------- Productivity (real where possible) ----------------
  {
    name: "productivity_action",
    description:
      "Opens productivity apps/sites: open_calendar, open_notes, open_todo, create_reminder, set_timer. (Reminders/timers are noted to memory; OS-level timer integration is limited.)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: ["open_calendar", "open_notes", "open_todo", "create_reminder", "set_timer"],
        },
        details: { type: Type.STRING },
        duration_seconds: { type: Type.NUMBER },
      },
      required: ["action"],
    },
  },

  // ---------------- System info (real) ----------------
  {
    name: "getSystemInfo",
    description: "Returns REAL device time, timezone, OS, screen resolution, memory, and hostname.",
    parameters: { type: Type.OBJECT, properties: {} },
  },

  // ---------------- Voice Identity & Biometrics ----------------
  {
    name: "get_voice_status",
    description: "Returns the current voice identity enrollment status, registered owner name, and verification state.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "enroll_voice_profile",
    description: "Guides the user to enroll their voice identity or launches the voice enrollment interface.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        owner_name: { type: Type.STRING, description: "Name of the voice profile owner e.g. Vikas" },
      },
    },
  },
  {
    name: "delete_voice_profile",
    description: "Deletes the enrolled owner voice profile. Requires explicit user confirmation.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        confirmed: { type: Type.BOOLEAN, description: "Set true ONLY after explicit user confirmation." },
      },
    },
  },
  // ---------------- Document Intelligence & AI Research ----------------
  {
    name: "query_knowledge_base",
    description: "Searches uploaded workspace documents (PDFs, code, spreadsheets, notes) using semantic indexing and returns detailed answers with page and section citations.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "The research question or topic to search across workspace documents" },
        doc_id: { type: Type.STRING, description: "Optional specific document ID to target" },
      },
      required: ["query"],
    },
  },
  {
    name: "analyze_document",
    description: "Performs deep thinking analysis, executive summary, or structural breakdown on a specific uploaded document.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        doc_id: { type: Type.STRING, description: "Document ID or filename to analyze" },
        focus_area: { type: Type.STRING, description: "Optional focus area e.g. summary, methodology, conclusions, tables, formulas, bugs" },
      },
    },
  },
  {
    name: "generate_study_materials",
    description: "Auto-generates MCQs, flashcards, mind maps, viva questions, or revision sheets from uploaded workspace documents.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        material_type: { type: Type.STRING, enum: ["mcqs", "flashcards", "mindmap", "viva", "all"], description: "Type of study material to generate" },
        doc_id: { type: Type.STRING, description: "Optional target document ID" },
      },
    },
  },
  {
    name: "compare_documents",
    description: "Performs multi-document cross-reasoning, comparing similarities, contradictions, and syntheses across multiple uploaded files.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        doc_ids: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of document IDs or filenames to compare" },
      },
    },
  },
  {
    name: "open_document_workspace",
    description: "Launches the Document Intelligence & Research Workspace modal on the user screen.",
    parameters: { type: Type.OBJECT, properties: {} },
  },

  // ---------------- UI tools (executed on client) ----------------
  {
    name: "changeAssistantMood",
    description: "Changes शाश्वत's on-screen mood/theme (witty, playful, focused, charming, energetic).",
    parameters: {
      type: Type.OBJECT,
      properties: { mood: { type: Type.STRING, enum: ["witty", "playful", "focused", "charming", "energetic"] } },
      required: ["mood"],
    },
  },
  {
    name: "showVisualCard",
    description: "Displays a visual information card overlay in the assistant UI.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        content: { type: Type.STRING },
        category: { type: Type.STRING },
        url: { type: Type.STRING },
      },
      required: ["title", "content"],
    },
  },
];
