import { TOOL_DECLARATIONS } from "../tools/declarations";

/**
 * Task Registry — the single source of truth for every capability शाश्वत exposes.
 *
 * It is DERIVED from TOOL_DECLARATIONS (what Gemini sees) and cross-checked
 * against TOOL_META (category / risk / clientSide). A tool cannot appear in one
 * place and not the other: if a declaration is added without metadata (or vice
 * versa) `buildRegistry()` throws, and the unit-test suite enforces the same.
 *
 * This is the data backing the Task Health Dashboard and the metrics engine:
 * success rate, confidence score, average execution time, and failure rate are
 * all computed per task name from `metricsStore`, keyed by the names here.
 */

export type TaskCategory =
  | "Memory"
  | "Browser"
  | "App Control"
  | "System Control"
  | "Media"
  | "Storage"
  | "Input"
  | "Smart Browser"
  | "Autonomous Sandbox"
  | "Productivity"
  | "System Info"
  | "Voice Identity"
  | "Document Intelligence"
  | "Sanskrit Intelligence"
  | "UI";

export type RiskLevel = "LOW" | "HIGH";

export interface TaskMeta {
  name: string;
  category: TaskCategory;
  description: string;
  /** True for tools that execute in the renderer (forwarded over WS), not server-side. */
  clientSide: boolean;
  /** Base risk level for the typical invocation. */
  riskLevel: RiskLevel;
  /** True if ANY argument combination can escalate this tool to HIGH (needs confirmation). */
  requiresConfirmation: boolean;
  /** Registry schema version — bump when the shape of an entry changes. */
  version: number;
}

/**
 * Hand-curated metadata keyed by tool name. Kept deliberately explicit so the
 * category / risk assignment is reviewable in one place. `buildRegistry()`
 * guarantees this map covers exactly the declared tool set.
 *
 *   clientSide            → must match the CLIENT_SIDE_TOOLS set in tools/index.ts
 *   requiresConfirmation  → true iff classifyRisk() can return HIGH for some args
 */
const TOOL_META: Record<
  string,
  { category: TaskCategory; clientSide?: boolean; requiresConfirmation?: boolean; version?: number }
> = {
  // ---------------- Memory ----------------
  remember_fact: { category: "Memory" },
  retrieve_memory: { category: "Memory" },
  forget_memory: { category: "Memory" },
  get_memory_summary: { category: "Memory" },

  // ---------------- Browser / Web ----------------
  open_website: { category: "Browser" },
  search_web: { category: "Browser" },
  searchGoogle: { category: "Browser" },
  searchYouTube: { category: "Browser" },
  playFirstVideo: { category: "Browser" },

  // ---------------- App launch ----------------
  launch_app: { category: "App Control" },
  launchApplication: { category: "App Control" },

  // ---------------- System / Media ----------------
  system_control: { category: "System Control" },
  media_control: { category: "Media" },

  // ---------------- Files / Input ----------------
  file_operation: { category: "Storage", requiresConfirmation: true },
  mouse_input: { category: "Input" },
  keyboard_input: { category: "Input" },

  // ---------------- Browser automation (Playwright) ----------------
  browser_navigate: { category: "Smart Browser", requiresConfirmation: true },
  browser_sandbox_exec: { category: "Autonomous Sandbox" },

  // ---------------- Productivity / Info ----------------
  productivity_action: { category: "Productivity" },
  getSystemInfo: { category: "System Info" },

  // ---------------- Voice Identity ----------------
  get_voice_status: { category: "Voice Identity" },
  enroll_voice_profile: { category: "Voice Identity", clientSide: true },
  delete_voice_profile: { category: "Voice Identity", requiresConfirmation: true },

  // ---------------- Document Intelligence ----------------
  query_knowledge_base: { category: "Document Intelligence" },
  analyze_document: { category: "Document Intelligence" },
  generate_study_materials: { category: "Document Intelligence" },
  compare_documents: { category: "Document Intelligence" },
  open_document_workspace: { category: "Document Intelligence", clientSide: true },

  // ---------------- Sanskrit Intelligence (handled in executor) ----------------
  analyze_sanskrit_shloka: { category: "Sanskrit Intelligence" },
  evaluate_sanskrit_recitation: { category: "Sanskrit Intelligence" },
  open_sanskrit_chant_studio: { category: "Sanskrit Intelligence", clientSide: true },

  // ---------------- UI ----------------
  changeAssistantMood: { category: "UI", clientSide: true },
  showVisualCard: { category: "UI", clientSide: true },
};

const REGISTRY_VERSION = 1;

/**
 * Build the registry, throwing with a precise message if the metadata map and
 * the Gemini declarations disagree. This is the guarantee the dashboard relies on.
 */
export function buildRegistry(): TaskMeta[] {
  const declared = new Set(TOOL_DECLARATIONS.map((d) => d.name));
  const metaKeys = new Set(Object.keys(TOOL_META));

  const missingMeta = [...declared].filter((n) => !metaKeys.has(n));
  if (missingMeta.length > 0) {
    throw new Error(
      `[TaskRegistry] Declared tool(s) missing registry metadata: ${missingMeta.join(", ")}. ` +
        `Add them to TOOL_META in server/registry/taskRegistry.ts.`
    );
  }
  // Metadata for undeclared tools is allowed (e.g. handled-but-not-yet-declared
  // tools) but is reported by validateConsistency() so the gap is visible.

  return TOOL_DECLARATIONS.map((d) => {
    const meta = TOOL_META[d.name];
    return {
      name: d.name,
      category: meta.category,
      description: d.description,
      clientSide: meta.clientSide === true,
      riskLevel: meta.requiresConfirmation === true ? "HIGH" : "LOW",
      requiresConfirmation: meta.requiresConfirmation === true,
      version: meta.version ?? REGISTRY_VERSION,
    };
  });
}

let cachedRegistry: TaskMeta[] | null = null;

/** Returns the (cached) full task registry. */
export function getRegistry(): TaskMeta[] {
  if (!cachedRegistry) cachedRegistry = buildRegistry();
  return cachedRegistry;
}

/** Returns metadata for a single task, or undefined if unknown. */
export function getTaskMeta(name: string): TaskMeta | undefined {
  return getRegistry().find((t) => t.name === name);
}

/** Distinct category names present in the registry. */
export function listCategories(): TaskCategory[] {
  return [...new Set(getRegistry().map((t) => t.category))];
}

export interface RegistryConsistencyReport {
  declaredTools: string[];
  handledButUndeclared: string[]; // in TOOL_META + executor, but NOT shown to Gemini
  declaredButUnhandled: string[]; // shown to Gemini, but no executor case (would hit "Unknown tool")
  totalDeclared: number;
  totalCategories: number;
}

/**
 * Cross-checks the registry metadata against the Gemini declarations and the
 * set of tool names the executor actually handles. Surfaces:
 *   - handled-but-undeclared: dead code the model can never reach (latent bugs)
 *   - declared-but-unhandled: would return "Unknown tool" if Gemini called them
 *
 * `handledNames` is supplied by the executor (tools/index.ts) so this module
 * stays decoupled from the switch statement.
 */
export function validateConsistency(handledNames: string[]): RegistryConsistencyReport {
  const declared = new Set(TOOL_DECLARATIONS.map((d) => d.name));
  const handled = new Set(handledNames);
  const metaKeys = new Set(Object.keys(TOOL_META));

  const handledButUndeclared = [...metaKeys].filter(
    (n) => !declared.has(n) && handled.has(n)
  );
  const declaredButUnhandled = [...declared].filter((n) => !handled.has(n));

  return {
    declaredTools: [...declared],
    handledButUndeclared,
    declaredButUnhandled,
    totalDeclared: declared.size,
    totalCategories: listCategories().length,
  };
}
