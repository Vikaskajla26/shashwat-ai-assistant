/**
 * The 13-state AI consciousness lifecycle.
 *
 * `disconnected` and `connecting` are retained for legacy/runtime compatibility
 * (the WebSocket lifecycle still uses them), but the cinematic layers treat
 * `disconnected` as `sleeping` and `connecting` as `booting`/`reasoning`.
 */
export type AssistantState =
  | 'disconnected'
  | 'connecting'
  | 'booting'
  | 'idle'
  | 'wakeWord'
  | 'listening'
  | 'understanding'
  | 'reasoning'
  | 'searching'
  | 'executing'
  | 'speaking'
  | 'learning'
  | 'success'
  | 'error'
  | 'sleeping';

/** Phases the server may push over the live socket (additive, backward-compatible). */
export type AssistantPhase = 'understanding' | 'reasoning' | 'searching' | 'executing' | 'learning';

export type AssistantMood = 'witty' | 'playful' | 'focused' | 'charming' | 'energetic';

export type SandboxMode = 'general' | 'research' | 'shopping' | 'email' | 'calendar';

export interface SandboxTab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  active: boolean;
  isLoading?: boolean;
  contentSummary?: string;
  domNodesCount?: number;
  extractedData?: Record<string, any>;
}

export interface TaskStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'self_healing' | 'failed';
  detail?: string;
}

export interface TaskExecutionPlan {
  id: string;
  goal: string;
  mode: SandboxMode;
  steps: TaskStep[];
  currentStepIndex: number;
  status: 'planning' | 'executing' | 'verifying' | 'completed' | 'needs_confirmation';
  findingsSummary?: string;
  requiresUserConfirmation?: boolean;
  confirmationAction?: string;
}

export interface SandboxDownload {
  id: string;
  filename: string;
  size: string;
  progress: number;
  status: 'downloading' | 'completed' | 'failed';
  url: string;
}

export interface VisualCardData {
  id: string;
  title: string;
  content: string;
  category?: string;
  timestamp: string;
  url?: string;
}

export interface ToolCallPayload {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface ToolExecutionEvent {
  id: string;
  toolName: string;
  status: 'executing' | 'success' | 'failed';
  message: string;
  timestamp: string;
  actionUrl?: string;
  plan?: TaskExecutionPlan;
}

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: string;
}

export interface AudioVolumeEvent {
  inputVolume: number;  // 0 - 100
  outputVolume: number; // 0 - 100
}

export type AIProviderId = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'openrouter' | 'local';

export interface ClientProviderMeta {
  id: AIProviderId;
  name: string;
  enabled: boolean;
  maskedApiKey: string;
  hasKey: boolean;
  selectedModel: string;
  availableModels: string[];
  customEndpoint?: string;
  status: 'valid' | 'invalid' | 'unconfigured' | 'error';
  lastConnectedAt?: string;
  lastError?: string;
}

