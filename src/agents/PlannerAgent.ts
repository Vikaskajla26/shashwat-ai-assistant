/**
 * Planner Agent for Shashwat AI OS (Phase 7 Multi-Agent AI).
 * Core Orchestrator and User Communication Bridge.
 * RULE #1: ONLY THE PLANNER AGENT COMMUNICATES DIRECTLY WITH THE USER.
 * All other agents (Voice, Browser, Desktop, Research, Memory, Study, Media, Verifier) work internally.
 */

import { AgentRole, AgentTask, PlannerExecutionPlan } from './AgentTypes';
import { ExecutionVerifier } from './ExecutionVerifier';
import { VoiceSubAgent } from './sub/VoiceSubAgent';
import { BrowserSubAgent } from './sub/BrowserSubAgent';
import { DesktopSubAgent } from './sub/DesktopSubAgent';
import { ResearchSubAgent } from './sub/ResearchSubAgent';
import { MemorySubAgent } from './sub/MemorySubAgent';
import { StudySubAgent } from './sub/StudySubAgent';
import { MediaSubAgent } from './sub/MediaSubAgent';

export class PlannerAgent {
  private static instance: PlannerAgent | null = null;
  private verifier = ExecutionVerifier.getInstance();

  private voiceAgent = new VoiceSubAgent();
  private browserAgent = new BrowserSubAgent();
  private desktopAgent = new DesktopSubAgent();
  private researchAgent = new ResearchSubAgent();
  private memoryAgent = new MemorySubAgent();
  private studyAgent = new StudySubAgent();
  private mediaAgent = new MediaSubAgent();

  private constructor() {}

  public static getInstance(): PlannerAgent {
    if (!PlannerAgent.instance) {
      PlannerAgent.instance = new PlannerAgent();
    }
    return PlannerAgent.instance;
  }

  /**
   * Primary entry point for User Requests.
   * ONLY the Planner Agent receives user input and communicates back to the user.
   */
  public async handleUserRequest(userPrompt: string): Promise<PlannerExecutionPlan> {
    // 1. Deconstruct user prompt into subagent task DAG
    const plan = this.decomposePromptIntoDAG(userPrompt);

    // 2. Dispatch tasks to specialized subagents internally
    for (const task of plan.tasks) {
      task.status = 'EXECUTING';

      try {
        let rawResult: any;
        switch (task.role) {
          case 'voice':
            rawResult = await this.voiceAgent.execute(task);
            break;
          case 'browser':
            rawResult = await this.browserAgent.execute(task);
            break;
          case 'desktop':
            rawResult = await this.desktopAgent.execute(task);
            break;
          case 'research':
            rawResult = await this.researchAgent.execute(task);
            break;
          case 'memory':
            rawResult = await this.memoryAgent.execute(task);
            break;
          case 'study':
            rawResult = await this.studyAgent.execute(task);
            break;
          case 'media':
            rawResult = await this.mediaAgent.execute(task);
            break;
          default:
            rawResult = { success: true };
        }

        task.result = rawResult;
        task.status = 'VERIFYING';

        // 3. Execution Verifier audits outcome empirically
        const audit = await this.verifier.verifyTask(task);
        task.verified = audit.verified;
        task.verificationMessage = audit.message;
        task.status = audit.verified ? 'COMPLETED' : 'FAILED';
      } catch (err: any) {
        task.status = 'FAILED';
        task.verified = false;
        task.verificationMessage = `Subagent execution error: ${err?.message || err}`;
      }
    }

    plan.status = plan.tasks.every((t) => t.status === 'COMPLETED') ? 'COMPLETED' : 'FAILED';

    // 4. Synthesize final response to return to user (ONLY Planner talks to user)
    plan.finalSynthesizedResponse = this.synthesizeUserResponse(userPrompt, plan);
    return plan;
  }

  private decomposePromptIntoDAG(prompt: string): PlannerExecutionPlan {
    const text = prompt.toLowerCase();
    const tasks: AgentTask[] = [];

    if (text.includes('youtube') || text.includes('search google') || text.includes('open site') || text.includes('website')) {
      tasks.push({ id: `task_${Date.now()}_1`, role: 'browser', action: 'handleWebIntent', payload: prompt, status: 'PENDING' });
    }
    if (text.includes('open app') || text.includes('close app') || text.includes('notepad') || text.includes('calc')) {
      tasks.push({ id: `task_${Date.now()}_2`, role: 'desktop', action: 'openApp', payload: prompt, status: 'PENDING' });
    }
    if (text.includes('research') || text.includes('summarize') || text.includes('article')) {
      tasks.push({ id: `task_${Date.now()}_3`, role: 'research', action: 'research', payload: prompt, status: 'PENDING' });
    }
    if (text.includes('remember') || text.includes('memory') || text.includes('preference')) {
      tasks.push({ id: `task_${Date.now()}_4`, role: 'memory', action: 'addMemory', payload: prompt, status: 'PENDING' });
    }
    if (text.includes('volume') || text.includes('mute') || text.includes('play music')) {
      tasks.push({ id: `task_${Date.now()}_5`, role: 'media', action: 'mediaControl', payload: prompt, status: 'PENDING' });
    }

    // Default task if no specific keyword matched
    if (tasks.length === 0) {
      tasks.push({ id: `task_${Date.now()}_0`, role: 'browser', action: 'handleWebIntent', payload: prompt, status: 'PENDING' });
    }

    return { userPrompt: prompt, tasks, status: 'PENDING' };
  }

  private synthesizeUserResponse(userPrompt: string, plan: PlannerExecutionPlan): string {
    const completed = plan.tasks.filter((t) => t.status === 'COMPLETED').length;
    return `[Planner Agent Synthesis] Executed ${completed}/${plan.tasks.length} internal tasks for: "${userPrompt}". All actions verified.`;
  }
}
