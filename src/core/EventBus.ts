/**
 * Type-safe, decoupled EventBus for Shashwat AI OS.
 * Enables zero-coupling asynchronous communication between core modules.
 * Isolated listener execution prevents subscriber exceptions from crashing the bus.
 */

export type EventCallback<T = any> = (payload: T) => void | Promise<void>;

export interface SystemEvent<T = any> {
  type: string;
  payload: T;
  sourceModule?: string;
  timestamp: number;
}

export class EventBus {
  private static instance: EventBus | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private wildcardListeners: Set<(event: SystemEvent) => void> = new Set();
  private eventHistory: SystemEvent[] = [];
  private maxHistorySize = 100;

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /** Subscribe to a specific event type */
  public on<T = any>(eventType: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const set = this.listeners.get(eventType);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  /** Subscribe to all system events */
  public onAny(callback: (event: SystemEvent) => void): () => void {
    this.wildcardListeners.add(callback);
    return () => {
      this.wildcardListeners.delete(callback);
    };
  }

  /** Emit an event asynchronously to all registered listeners */
  public emit<T = any>(type: string, payload: T, sourceModule?: string): void {
    const event: SystemEvent<T> = {
      type,
      payload,
      sourceModule,
      timestamp: Date.now(),
    };

    // Store in rolling history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Execute direct listeners safely
    const targetSet = this.listeners.get(type);
    if (targetSet) {
      targetSet.forEach((cb) => {
        try {
          const result = cb(payload);
          if (result instanceof Promise) {
            result.catch((err) => {
              console.error(`[EventBus] Async handler error for '${type}':`, err);
            });
          }
        } catch (err) {
          console.error(`[EventBus] Sync handler error for '${type}':`, err);
        }
      });
    }

    // Execute wildcard listeners safely
    this.wildcardListeners.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error(`[EventBus] Wildcard handler error for '${type}':`, err);
      }
    });
  }

  public getHistory(): SystemEvent[] {
    return [...this.eventHistory];
  }

  public clearHistory(): void {
    this.eventHistory = [];
  }
}
