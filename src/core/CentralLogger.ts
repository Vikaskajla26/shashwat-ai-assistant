/**
 * Centralized Logging Engine for Shashwat AI OS.
 * Features:
 * - Structured log levels (DEBUG, INFO, WARN, ERROR, FATAL)
 * - Automatic sensitive data masking (API keys, passwords)
 * - EventBus broadcasting & IPC database persistence
 * - Console formatted output
 */

import { EventBus } from './EventBus';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogEntry {
  id: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
  timestamp: number;
}

export class CentralLogger {
  private static instance: CentralLogger | null = null;
  private minLevel: LogLevel = 'INFO';
  private logs: LogEntry[] = [];
  private maxInMemory = 200;

  private levelWeights: Record<LogLevel, number> = {
    DEBUG: 10,
    INFO: 20,
    WARN: 30,
    ERROR: 40,
    FATAL: 50,
  };

  private constructor() {}

  public static getInstance(): CentralLogger {
    if (!CentralLogger.instance) {
      CentralLogger.instance = new CentralLogger();
    }
    return CentralLogger.instance;
  }

  public setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /** Mask sensitive values like API keys or tokens */
  private sanitizeData(data: any): any {
    if (!data) return data;
    if (typeof data === 'string') {
      return data.replace(/(AIzaSy[A-Za-z0-9_-]{33}|sk-[A-Za-z0-9_-]{48})/g, '********[RESTRICTED]********');
    }
    if (typeof data === 'object') {
      const sanitized: any = Array.isArray(data) ? [] : {};
      for (const key of Object.keys(data)) {
        if (/api_?key|secret|password|token/i.test(key) && typeof data[key] === 'string') {
          sanitized[key] = '********[RESTRICTED]********';
        } else {
          sanitized[key] = this.sanitizeData(data[key]);
        }
      }
      return sanitized;
    }
    return data;
  }

  public log(level: LogLevel, module: string, message: string, data?: any): void {
    if (this.levelWeights[level] < this.levelWeights[this.minLevel]) {
      return;
    }

    const sanitizedMessage = this.sanitizeData(message);
    const sanitizedData = this.sanitizeData(data);

    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      level,
      module,
      message: sanitizedMessage,
      data: sanitizedData,
      timestamp: Date.now(),
    };

    // Store in-memory
    this.logs.push(entry);
    if (this.logs.length > this.maxInMemory) {
      this.logs.shift();
    }

    // Console output
    const prefix = `[${new Date(entry.timestamp).toISOString()}] [${level}] [${module}]`;
    switch (level) {
      case 'DEBUG':
        console.debug(prefix, sanitizedMessage, sanitizedData || '');
        break;
      case 'INFO':
        console.log(prefix, sanitizedMessage, sanitizedData || '');
        break;
      case 'WARN':
        console.warn(prefix, sanitizedMessage, sanitizedData || '');
        break;
      case 'ERROR':
      case 'FATAL':
        console.error(prefix, sanitizedMessage, sanitizedData || '');
        break;
    }

    // Broadcast on EventBus
    EventBus.getInstance().emit('system:log', entry, module);

    // Persist via IPC if running in Electron environment
    if (typeof window !== 'undefined' && (window as any).electronAPI?.db?.addLog) {
      try {
        (window as any).electronAPI.db.addLog(level, `${sanitizedMessage} ${sanitizedData ? JSON.stringify(sanitizedData) : ''}`, module);
      } catch (_) {}
    }
  }

  public debug(module: string, message: string, data?: any): void {
    this.log('DEBUG', module, message, data);
  }

  public info(module: string, message: string, data?: any): void {
    this.log('INFO', module, message, data);
  }

  public warn(module: string, message: string, data?: any): void {
    this.log('WARN', module, message, data);
  }

  public error(module: string, message: string, data?: any): void {
    this.log('ERROR', module, message, data);
  }

  public fatal(module: string, message: string, data?: any): void {
    this.log('FATAL', module, message, data);
  }

  public getRecentLogs(): LogEntry[] {
    return [...this.logs];
  }
}
