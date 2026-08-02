/**
 * Agent Types & Contracts for Shashwat AI OS (Phase 7 Multi-Agent AI).
 * Defines the 9 specialized agent roles, task DAG structures, internal messages,
 * and verification standards.
 */

export type AgentRole =
  | 'planner'
  | 'voice'
  | 'browser'
  | 'desktop'
  | 'research'
  | 'memory'
  | 'study'
  | 'media'
  | 'verifier';

export type TaskStatus = 'PENDING' | 'EXECUTING' | 'VERIFYING' | 'COMPLETED' | 'FAILED';

export interface AgentTask {
  id: string;
  role: AgentRole;
  action: string;
  payload: any;
  status: TaskStatus;
  result?: any;
  verified?: boolean;
  verificationMessage?: string;
}

export interface InternalMessage {
  id: string;
  from: AgentRole;
  to: AgentRole;
  taskId: string;
  type: 'TASK_REQUEST' | 'TASK_RESPONSE' | 'VERIFICATION_REQUEST' | 'VERIFICATION_RESULT';
  data: any;
  timestamp: number;
}

export interface PlannerExecutionPlan {
  userPrompt: string;
  tasks: AgentTask[];
  status: TaskStatus;
  finalSynthesizedResponse?: string;
}
