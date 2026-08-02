import { AssistantMood, VisualCardData, ToolExecutionEvent } from '../types';

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Client-side ToolManager — handles ONLY UI-local tools.
 *
 * All real tools (app launch, system control, file ops, browser automation,
 * memory, input automation, etc.) now execute SERVER-SIDE and never pass
 * through this class.
 *
 * The server forwards UI-only tool calls (changeAssistantMood, showVisualCard)
 * to the client via WebSocket. This executor handles them and returns the
 * response so the Gemini session can continue.
 */
export class ToolManager {
  private onMoodChange?: (mood: AssistantMood) => void;
  private onVisualCard?: (card: VisualCardData) => void;
  private onToolEvent?: (event: ToolExecutionEvent) => void;
  private onOpenDocWorkspace?: () => void;
  private onOpenEnrollment?: () => void;

  constructor(handlers: {
    onMoodChange?: (mood: AssistantMood) => void;
    onVisualCard?: (card: VisualCardData) => void;
    onToolEvent?: (event: ToolExecutionEvent) => void;
    onOpenDocWorkspace?: () => void;
    onOpenEnrollment?: () => void;
  } = {}) {
    this.onMoodChange = handlers.onMoodChange;
    this.onVisualCard = handlers.onVisualCard;
    this.onToolEvent = handlers.onToolEvent;
    this.onOpenDocWorkspace = handlers.onOpenDocWorkspace;
    this.onOpenEnrollment = handlers.onOpenEnrollment;
  }

  /**
   * Execute a client-side (UI-only) tool call.
   * Returns the response that will be sent back to Gemini.
   */
  public async executeTool(callId: string, name: string, args: Record<string, any>): Promise<any> {
    const timestamp = new Date().toLocaleTimeString();

    this.notifyEvent({
      id: callId,
      toolName: name,
      status: 'executing',
      message: `Executing UI tool ${name}...`,
      timestamp,
    });

    try {
      let result: any = { status: 'success' };

      switch (name) {
        case 'changeAssistantMood': {
          const targetMood = (args.mood || 'witty') as AssistantMood;
          if (this.onMoodChange) {
            this.onMoodChange(targetMood);
          }
          result = {
            currentMood: targetMood,
            message: `Mood changed to ${targetMood}`,
          };
          this.notifyEvent({
            id: callId,
            toolName: name,
            status: 'success',
            message: `Mood updated to ${targetMood}`,
            timestamp,
          });
          break;
        }

        case 'showVisualCard': {
          const cardData: VisualCardData = {
            id: Date.now().toString(),
            title: args.title || 'Information',
            content: args.content || '',
            category: args.category || 'General',
            timestamp,
            url: args.url,
          };
          if (this.onVisualCard) {
            this.onVisualCard(cardData);
          }
          result = {
            cardDisplayed: true,
            title: cardData.title,
          };
          this.notifyEvent({
            id: callId,
            toolName: name,
            status: 'success',
            message: `Displayed card: ${cardData.title}`,
            timestamp,
          });
          break;
        }

        case 'open_document_workspace': {
          if (this.onOpenDocWorkspace) {
            this.onOpenDocWorkspace();
          }
          result = { workspaceOpened: true, message: 'Document Intelligence & Research Workspace launched' };
          this.notifyEvent({
            id: callId,
            toolName: name,
            status: 'success',
            message: 'Launched Document Intelligence Workspace',
            timestamp,
          });
          break;
        }

        case 'enroll_voice_profile': {
          if (this.onOpenEnrollment) {
            this.onOpenEnrollment();
          }
          result = { enrollmentOpened: true, message: 'Voice identity enrollment modal launched' };
          this.notifyEvent({
            id: callId,
            toolName: name,
            status: 'success',
            message: 'Opened Voice Identity Enrollment UI',
            timestamp,
          });
          break;
        }

        default: {
          // Any tool that shouldn't reach here (server-side tools were not forwarded)
          result = { status: 'error', error: `Client-side handler not found for: ${name}` };
          this.notifyEvent({
            id: callId,
            toolName: name,
            status: 'failed',
            message: `No client handler: ${name}`,
            timestamp,
          });
        }
      }

      return result;
    } catch (error: any) {
      this.notifyEvent({
        id: callId,
        toolName: name,
        status: 'failed',
        message: error?.message || 'Tool execution failed',
        timestamp,
      });
      return { error: error?.message || 'Execution error' };
    }
  }

  private notifyEvent(event: ToolExecutionEvent) {
    if (this.onToolEvent) {
      this.onToolEvent(event);
    }
  }
}
