/**
 * Global State Manager for Shashwat AI OS.
 * Maintains centralized application state with atomic updates and EventBus emission.
 */

import { EventBus } from './EventBus';
import { AssistantState } from '../types';

export interface GlobalAppState {
  assistantState: AssistantState;
  activeProvider: string;
  isMicActive: boolean;
  isSpeakerActive: boolean;
  inputVolumeNorm: number;
  outputVolumeNorm: number;
  isOfflineMode: boolean;
  currentThought?: string;
  lastResponseTimeMs: number;
}

export class GlobalStateManager {
  private static instance: GlobalStateManager | null = null;
  private state: GlobalAppState = {
    assistantState: 'idle',
    activeProvider: 'gemini-3.1-flash-live-preview',
    isMicActive: false,
    isSpeakerActive: false,
    inputVolumeNorm: 0,
    outputVolumeNorm: 0,
    isOfflineMode: false,
    lastResponseTimeMs: 0,
  };
  private eventBus = EventBus.getInstance();
  private listeners = new Set<(s: GlobalAppState) => void>();

  private constructor() {}

  public static getInstance(): GlobalStateManager {
    if (!GlobalStateManager.instance) {
      GlobalStateManager.instance = new GlobalStateManager();
    }
    return GlobalStateManager.instance;
  }

  public getState(): Readonly<GlobalAppState> {
    return this.state;
  }

  public updateState(partial: Partial<GlobalAppState>, source = 'GlobalStateManager'): void {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...partial };

    // Emit event if state actually changed
    if (JSON.stringify(prevState) !== JSON.stringify(this.state)) {
      this.eventBus.emit('state:updated', { state: this.state, prevState }, source);
      this.listeners.forEach((fn) => fn(this.state));
    }
  }

  public setAssistantState(assistantState: AssistantState, source = 'GlobalStateManager'): void {
    this.updateState({ assistantState }, source);
  }

  public subscribe(fn: (s: GlobalAppState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
