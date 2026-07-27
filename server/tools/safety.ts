/**
 * Safety / permission layer.
 *
 * Every tool call is classified as LOW (execute immediately) or HIGH
 * (require explicit user confirmation before running). HIGH actions are
 * destructive or hard to reverse: deleting files, formatting, uninstalling,
 * installing software, purchases, sending emails, submitting payment forms,
 * changing system/security config, running destructive terminal commands.
 *
 * Confirmation protocol (voice):
 *   A HIGH tool call WITHOUT `confirmed: true` returns
 *     { status: "confirmation_required", question, tool, args }
 *   WITHOUT executing. The model is instructed (system prompt) to ask the
 *   user a clear yes/no question aloud, wait for the answer, and only re-call
 *   the SAME tool with `confirmed: true` if the user clearly says yes.
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
    // --- Always HIGH ---
    case "delete_file":
    case "delete_files":
      return high(`Are you sure you want to permanently delete "${args.target_name || args.path || "this file"}"?`);

    case "move_file":
    case "rename_file":
      return high(`Okay to move "${args.target_name || args.source || "this file"}"?`);

    case "format_drive":
      return high(`This will format a drive and erase everything. Are you absolutely sure?`);

    case "uninstall_app":
    case "install_software":
      return high(`Are you sure you want to ${toolName === "uninstall_app" ? "uninstall" : "install"} ${args.app_name || args.appName || "this software"}?`);

    case "send_email":
    case "send_message":
      return high(`Should I send ${toolName === "send_email" ? "this email" : "this message"} now?`);

    case "make_purchase":
      return high(`This will make a payment. Do you want me to proceed with the purchase?`);

    case "change_settings":
    case "system_config":
      return high(`This changes a system setting. Should I go ahead and change it?`);

    case "run_terminal":
    case "terminal_command": {
      const cmd = String(args.command || args.cmd || "");
      // Destructive shell commands are HIGH; harmless lookups can be LOW.
      if (/\b(rm|del|format|mkfs|shutdown|reboot|reg delete|diskpart|takeown|icacls)\b/i.test(cmd)) {
        return high(`This terminal command can change or delete data. Run "${cmd}"?`);
      }
      return { level: "LOW" };
    }

    // --- file_operation: only the delete/overwrite branches are HIGH ---
    case "file_operation": {
      const action = String(args.action || "").toLowerCase();
      if (action === "delete" || action === "delete_file" || action === "move" || action === "rename") {
        return high(`Are you sure you want to ${action} "${args.target_name || "this file"}"?`);
      }
      return { level: "LOW" };
    }

    // --- browser_navigate: form submission / purchase are HIGH ---
    case "browser_navigate": {
      const action = String(args.action || "").toLowerCase();
      if (action === "fill_form" && /purchase|pay|checkout|buy|submit order/i.test(String(args.details || ""))) {
        return high(`This looks like a purchase. Submit the form?`);
      }
      return { level: "LOW" };
    }

    // --- Everything else is LOW ---
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
