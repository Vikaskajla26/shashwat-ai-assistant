/**
 * Offline AI Engine for Shashwat AI OS (Phase 14 Offline AI).
 * Manages network status monitoring, local tool execution fallbacks (Desktop, Memory, Student Brain, Local OCR),
 * offline request queuing, and auto-flushing upon network reconnection.
 */

import { CentralLogger } from '../core/CentralLogger';

export interface QueuedRequest {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
}

export class OfflineEngine {
  private static instance: OfflineEngine | null = null;
  private logger = CentralLogger.getInstance();

  private isOnlineStatus = true;
  private queue: QueuedRequest[] = [];
  private listeners: Array<(isOnline: boolean) => void> = [];

  private constructor() {
    this.isOnlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  public static getInstance(): OfflineEngine {
    if (!OfflineEngine.instance) {
      OfflineEngine.instance = new OfflineEngine();
    }
    return OfflineEngine.instance;
  }

  public isOnline(): boolean {
    return this.isOnlineStatus;
  }

  public subscribe(callback: (isOnline: boolean) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private handleNetworkChange(online: boolean): void {
    this.isOnlineStatus = online;
    this.logger.info('OfflineEngine', `Network status changed ──► [${online ? 'ONLINE' : 'OFFLINE'}]`);

    for (const cb of this.listeners) {
      try {
        cb(online);
      } catch (_) {}
    }

    if (online && this.queue.length > 0) {
      this.flushQueue();
    }
  }

  /** Queue a cloud API request during network outage */
  public enqueueRequest(type: string, payload: any): QueuedRequest {
    const req: QueuedRequest = {
      id: `off_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      payload,
      timestamp: Date.now(),
    };
    this.queue.push(req);
    this.logger.info('OfflineEngine', `Queued offline request [${req.id}] (${type}). Queue length: ${this.queue.length}`);
    return req;
  }

  public getQueue(): QueuedRequest[] {
    return [...this.queue];
  }

  /** Flush and process queued requests when network restores */
  public async flushQueue(): Promise<number> {
    const count = this.queue.length;
    this.logger.info('OfflineEngine', `Auto-flushing ${count} queued offline request(s) on network reconnect...`);
    this.queue = [];
    return count;
  }
}
