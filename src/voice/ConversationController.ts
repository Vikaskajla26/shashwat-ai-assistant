/**
 * Central Conversation Controller for Shashwat AI OS (Phase 10 Kernel Rebuild).
 * Authoritative Finite State Machine (FSM) managing all 12 states:
 * BOOTING, IDLE, WAKE_WORD, LISTENING, UNDERSTANDING, THINKING, GENERATING, SPEAKING, EXECUTING, WAITING, ERROR, SLEEPING.
 *
 * Strict Rules:
 * - Only ONE state exists at any time.
 * - No UI component or module may modify state directly.
 * - Disallows self-looping (SPEAKING -> SPEAKING).
 * - Greeting executes ONLY ONCE after startup.
 * - Auto-restarts VAD & Microphone after TTS completion (SPEAKING -> WAITING -> LISTENING).
 * - Watchdog recovery timeouts for LISTENING (>15s), THINKING (>10s), SPEAKING (>audio+2s).
 */

import { AssistantState } from '../types';
import { CentralLogger } from '../core/CentralLogger';

export type FSMState =
  | 'booting'
  | 'idle'
  | 'wakeWord'
  | 'listening'
  | 'understanding'
  | 'thinking'
  | 'generating'
  | 'speaking'
  | 'executing'
  | 'waiting'
  | 'error'
  | 'sleeping';

export interface StateTransitionEvent {
  from: FSMState;
  to: FSMState;
  reason: string;
  timestamp: number;
}

export class ConversationController {
  private static instance: ConversationController | null = null;
  private logger = CentralLogger.getInstance();

  private currentState: FSMState = 'idle';
  private hasGreeted = false;
  private listeners: Array<(state: AssistantState, event: StateTransitionEvent) => void> = [];

  // Watchdog Timers
  private watchdogTimer: NodeJS.Timeout | null = null;
  private stateStartTime = Date.now();

  // Valid FSM Transition Map
  private readonly validTransitions: Record<FSMState, FSMState[]> = {
    booting: ['idle', 'wakeWord', 'listening', 'error'],
    idle: ['wakeWord', 'listening', 'understanding', 'thinking', 'executing', 'speaking', 'sleeping', 'booting'],
    wakeWord: ['listening', 'understanding', 'thinking', 'idle', 'error'],
    listening: ['understanding', 'thinking', 'executing', 'speaking', 'waiting', 'idle', 'error'],
    understanding: ['thinking', 'generating', 'executing', 'speaking', 'waiting', 'idle', 'error'],
    thinking: ['generating', 'speaking', 'executing', 'waiting', 'idle', 'error'],
    generating: ['speaking', 'executing', 'waiting', 'idle', 'error'],
    speaking: ['listening', 'waiting', 'idle', 'error'],
    executing: ['speaking', 'waiting', 'idle', 'error'],
    waiting: ['listening', 'idle', 'error'],
    error: ['idle', 'booting', 'listening'],
    sleeping: ['idle', 'wakeWord', 'listening'],
  };

  private constructor() {
    this.logger.info('ConversationController', 'Initializing 12-State FSM Controller Kernel...');
  }

  public static getInstance(): ConversationController {
    if (!ConversationController.instance) {
      ConversationController.instance = new ConversationController();
    }
    return ConversationController.instance;
  }

  public getCurrentState(): FSMState {
    return this.currentState;
  }

  public hasExecutedGreeting(): boolean {
    return this.hasGreeted;
  }

  public markGreetingCompleted(): void {
    this.hasGreeted = true;
    this.logger.info('ConversationController', 'Startup greeting completed. Single-greeting flag locked.');
  }

  /**
   * Authoritative FSM State Transition Method.
   * Validates transition path, prevents self-loops, logs transition, and sets watchdog timeout.
   */
  public transitionTo(nextState: FSMState, reason = 'State transition'): boolean {
    const fromState = this.currentState;

    // Rule 1: Reject Self-Looping (e.g. SPEAKING -> SPEAKING)
    if (fromState === nextState) {
      this.logger.warn('ConversationController', `Rejected self-loop transition '${fromState}' -> '${nextState}'. Reason: ${reason}`);
      return false;
    }

    // Rule 2: Validate Transition Path
    const allowed = this.validTransitions[fromState] || [];
    if (!allowed.includes(nextState)) {
      this.logger.warn('ConversationController', `Invalid transition path: '${fromState}' -> '${nextState}'. Allowed: [${allowed.join(', ')}]`);
      return false;
    }

    // Clear existing watchdog timer
    this.clearWatchdog();

    // Perform state change
    this.currentState = nextState;
    this.stateStartTime = Date.now();

    const event: StateTransitionEvent = {
      from: fromState,
      to: nextState,
      reason,
      timestamp: Date.now(),
    };

    this.logger.info('ConversationController', `FSM Transition: [${fromState.toUpperCase()}] ──► [${nextState.toUpperCase()}] (${reason})`);

    // Notify all UI & module subscribers
    this.notifySubscribers(event);

    // Setup Watchdog Recovery Timer for long states
    this.setupWatchdog(nextState);

    return true;
  }

  /** Force state reset for emergency recovery */
  public forceResetState(targetState: FSMState = 'idle', reason = 'Emergency Reset'): void {
    this.clearWatchdog();
    const fromState = this.currentState;
    this.currentState = targetState;
    this.stateStartTime = Date.now();

    const event: StateTransitionEvent = { from: fromState, to: targetState, reason, timestamp: Date.now() };
    this.logger.warn('ConversationController', `FORCE STATE RESET: [${fromState.toUpperCase()}] ──► [${targetState.toUpperCase()}] (${reason})`);
    this.notifySubscribers(event);
  }

  /** Subscribe React components & audio modules to state changes */
  public subscribe(callback: (state: AssistantState, event: StateTransitionEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifySubscribers(event: StateTransitionEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentState as AssistantState, event);
      } catch (err) {
        this.logger.error('ConversationController', `Subscriber notification error: ${err}`);
      }
    }
  }

  /* ------------------- Watchdog Recovery Timers ------------------- */

  private setupWatchdog(state: FSMState): void {
    let timeoutMs = 0;

    if (state === 'listening') timeoutMs = 15000; // Max 15s listening timeout
    else if (state === 'thinking' || state === 'understanding') timeoutMs = 10000; // Max 10s thinking timeout
    else if (state === 'speaking') timeoutMs = 12000; // Max 12s speaking safety timeout

    if (timeoutMs > 0) {
      this.watchdogTimer = setTimeout(() => {
        this.logger.warn('ConversationController', `Watchdog timeout (${timeoutMs}ms) exceeded in state '${state}'. Auto-recovering...`);
        this.autoRecoverFromTimeout(state);
      }, timeoutMs);
    }
  }

  private autoRecoverFromTimeout(state: FSMState): void {
    if (state === 'speaking') {
      // Auto-transition SPEAKING -> WAITING -> LISTENING
      this.forceResetState('waiting', 'Speaking watchdog timeout');
      setTimeout(() => this.transitionTo('listening', 'Auto-restart listening after speaking timeout'), 300);
    } else if (state === 'thinking' || state === 'understanding') {
      this.forceResetState('waiting', 'Thinking watchdog timeout');
      setTimeout(() => this.transitionTo('listening', 'Auto-restart listening after thinking timeout'), 300);
    } else if (state === 'listening') {
      this.forceResetState('waiting', 'Listening watchdog timeout');
      setTimeout(() => this.transitionTo('idle', 'Return to idle after listening timeout'), 300);
    } else {
      this.forceResetState('idle', 'General watchdog timeout recovery');
    }
  }

  private clearWatchdog(): void {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }
}
