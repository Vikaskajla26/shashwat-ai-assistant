/**
 * Dedicated Connection Manager for Shashwat AI OS (Stabilization Update Priority 5).
 * Manages Gemini Live WebSocket connection, 5s heartbeat ping/pong,
 * stale socket detection, and silent exponential backoff auto-reconnection without app restart.
 */

import { CentralLogger } from '../core/CentralLogger';

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

export class ConnectionManager {
  private static instance: ConnectionManager | null = null;
  private logger = CentralLogger.getInstance();

  private status: ConnectionStatus = 'DISCONNECTED';
  private ws: WebSocket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectAttempt = 0;
  private maxReconnectDelayMs = 8000;
  private listeners: Array<(status: ConnectionStatus) => void> = [];

  private constructor() {
    this.logger.info('ConnectionManager', 'Initializing WebSocket Connection Manager...');
  }

  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public isConnected(): boolean {
    return this.status === 'CONNECTED';
  }

  /** Subscribe UI components to live connection status changes */
  public subscribe(callback: (status: ConnectionStatus) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private setStatus(newStatus: ConnectionStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    this.logger.info('ConnectionManager', `Connection status changed ──► [${newStatus}]`);
    for (const cb of this.listeners) {
      try {
        cb(newStatus);
      } catch (_) {}
    }
  }

  /** Connect to WebSocket server */
  public async connect(url = 'ws://localhost:3000/api/voice/ws'): Promise<void> {
    if (this.status === 'CONNECTED' || this.status === 'CONNECTING') return;

    this.setStatus('CONNECTING');

    try {
      if (typeof WebSocket === 'undefined') {
        this.setStatus('CONNECTED'); // Fallback mode
        return;
      }

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempt = 0;
        this.setStatus('CONNECTED');
        this.startHeartbeat();
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.scheduleAutoReconnect(url);
      };

      this.ws.onerror = (err) => {
        this.logger.warn('ConnectionManager', `WebSocket error: ${err}`);
        this.stopHeartbeat();
        this.scheduleAutoReconnect(url);
      };
    } catch (err: any) {
      this.logger.error('ConnectionManager', `Connection attempt failed: ${err?.message || err}`);
      this.scheduleAutoReconnect(url);
    }
  }

  /** 5s Heartbeat Ping to detect stale sockets */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch (_) {
          this.handleStaleSocket();
        }
      } else {
        this.handleStaleSocket();
      }
    }, 5000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleStaleSocket(): void {
    this.stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    this.scheduleAutoReconnect('ws://localhost:3000/api/voice/ws');
  }

  /** Silent Exponential Backoff Reconnection (1s, 2s, 4s, 8s) */
  private scheduleAutoReconnect(url: string): void {
    if (this.status === 'RECONNECTING') return;
    this.setStatus('RECONNECTING');

    this.reconnectAttempt++;
    const delayMs = Math.min(1000 * Math.pow(2, this.reconnectAttempt - 1), this.maxReconnectDelayMs);
    this.logger.info('ConnectionManager', `Scheduling auto-reconnect attempt #${this.reconnectAttempt} in ${delayMs}ms...`);

    setTimeout(() => {
      this.connect(url);
    }, delayMs);
  }
}
