/**
 * Safety / permission layer.
 *
 * Every tool call is classified as LOW (execute immediately) or HIGH
 * (require explicit user confirmation before running). HIGH actions are
 * destructive or hard to reverse: deleting/moving/renaming files, form
 * submissions that look like purchases, etc.
 *
 * Confirmation protocol (voice):
 *   A HIGH tool call WITHOUT `confirmed: true` returns
 *     { status: "confirmation_required", question, tool, args }
 *   WITHOUT executing. The model is instructed (system prompt) to ask the
 *   user a clear yes/no question aloud, wait for the answer, and only re-call
 *   the SAME tool with `confirmed: true` if the user clearly says yes.
 *
 * NOTE: this classifier is checked against the live task registry by
 * `safety.test.ts`. Only tool names that Gemini can actually emit (the declared
 * set) need cases here — phantom branches for non-existent tools were removed.
 */

export type RiskLevel = "LOW" | "HIGH";

export interface RiskDecision {
  level: RiskLevel;
  /** Human-friendly yes/no question for the model to ask aloud. */
  question?: string;
}

/**
 * Returns HIGH if the given tool/args require confirmation, else LOW.
 * Keep this conservative: when in doubt, confirm.
 */
export function classifyRisk(
  toolName: string,
  args: Record<string, any> = {}
): RiskDecision {
  switch (toolName) {
    // --- file_operation: only the destructive branches are HIGH ---
    // These action values must match server/tools/files.ts exactly.
    case "file_operation": {
      const action = String(args.action || "").toLowerCase();
      if (
        action === "delete" ||
        action === "delete_file" ||
        action === "remove" ||
        action === "move" ||
        action === "rename"
      ) {
        return high(`Are you sure you want to ${action} "${args.target_name || "this file"}"?`);
      }
      return { level: "LOW" };
    }

    // --- browser_navigate: a form submission that looks like a purchase is HIGH ---
    case "browser_navigate": {
      const action = String(args.action || "").toLowerCase();
      if (action === "fill_form" && /purchase|pay|checkout|buy|submit order/i.test(String(args.details || ""))) {
        return high(`This looks like a purchase. Submit the form?`);
      }
      return { level: "LOW" };
    }

    // --- delete_voice_profile: erases the enrolled identity ---
    case "delete_voice_profile": {
      return high(`This will permanently delete the enrolled voice profile. Continue?`);
    }

    // --- Everything else (reads, opens, launches, memory, searches, etc.) is LOW ---
    default:
      return { level: "LOW" };
  }
}

function high(question: string): RiskDecision {
  return { level: "HIGH", question };
}

/**
 * If a HIGH action is called WITHOUT confirmation, build the response the
 * model should receive so it asks the user instead of executing.
 */
export function confirmationRequiredResponse(
  toolName: string,
  args: Record<string, any>,
  question: string
) {
  return {
    status: "confirmation_required",
    executed: false,
    question,
    tool: toolName,
    args,
    instruction:
      "Do NOT execute yet. Ask the user this question aloud and wait for a clear yes or no. " +
      "Only if they clearly say yes, call this same tool again with confirmed=true.",
  };
}
