export interface CommandAction {
  id: string;
  name: string;
  category: 'system' | 'browser' | 'workspace' | 'media' | 'search';
  handler: (args?: Record<string, any>) => Promise<any> | void;
  shortcut?: string;
}

/**
 * CommandDispatcher — Decoupled intent router and command dispatcher for
 * keyboard shortcuts, voice intents, and bottom dock tool actions.
 */
export class CommandDispatcher {
  private static instance: CommandDispatcher | null = null;
  private commands: Map<string, CommandAction> = new Map();

  public static getInstance(): CommandDispatcher {
    if (!this.instance) {
      this.instance = new CommandDispatcher();
    }
    return this.instance;
  }

  public registerCommand(action: CommandAction): void {
    this.commands.set(action.id, action);
  }

  public async dispatch(commandId: string, args?: Record<string, any>): Promise<any> {
    const cmd = this.commands.get(commandId);
    if (!cmd) {
      console.warn(`[CommandDispatcher] Command "${commandId}" not registered.`);
      return null;
    }
    try {
      return await cmd.handler(args);
    } catch (err) {
      console.error(`[CommandDispatcher] Error executing "${commandId}":`, err);
      throw err;
    }
  }

  public listCommands(): CommandAction[] {
    return Array.from(this.commands.values());
  }
}
