/**
 * Memory Subsystem Module for Shashwat AI OS.
 * Manages MemoryManager, persistent SQLite storage, conversation history, and local Knowledge Index.
 */

import { BaseModule } from '../BaseModule';
import { MemoryManager } from '../../modules/MemoryManager';

export class MemoryModule extends BaseModule {
  public readonly id = 'memory';
  public readonly name = 'Memory & Database Subsystem';
  private memoryManager: MemoryManager | null = null;

  public async init(): Promise<void> {
    this.logger.info(this.id, 'Initializing Memory Subsystem...');
    this.memoryManager = MemoryManager.getInstance();
    this.status = 'UNINITIALIZED';
  }

  public async start(): Promise<void> {
    this.logger.info(this.id, 'Starting Memory Subsystem...');
    try {
      if (this.memoryManager) {
        await this.memoryManager.loadMemories();
      }
      this.status = 'RUNNING';
      this.logger.info(this.id, 'Memory Subsystem running.');
    } catch (err: any) {
      this.handleError(err, 'start');
    }
  }

  public async pause(): Promise<void> {
    this.status = 'PAUSED';
  }

  public async stop(): Promise<void> {
    this.status = 'UNINITIALIZED';
    this.memoryManager = null;
  }

  public getMemoryManager(): MemoryManager | null {
    return this.memoryManager;
  }
}
