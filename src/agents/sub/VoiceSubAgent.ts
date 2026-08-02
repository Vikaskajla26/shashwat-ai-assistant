/** Voice SubAgent (Internal Execution Only) */
import { AgentTask } from '../AgentTypes';

export class VoiceSubAgent {
  public async execute(task: AgentTask): Promise<any> {
    return { success: true, message: `Voice task '${task.action}' processed internally.` };
  }
}
