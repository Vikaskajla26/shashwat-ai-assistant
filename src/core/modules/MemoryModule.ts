/**
 * Memory Subsystem Module for Shashwat AI OS (Phase 3 Human Memory System).
 * Connects 3-tier MemoryManager (Short-term, Conversation, Encrypted Long-term)
 * into Phase 1 Core Architecture with auto-resume on boot and health checks.
 */

import { BaseModule } from '../BaseModule';
import { MemoryManager, MemoryItem } from '../../modules/MemoryManager';

export class MemoryModule extends BaseModule {
  public readonly id = 'memory';
  public readonly name = 'Human Memory Subsystem';
  private memoryManager: MemoryManager | null = null;

  public async init(): Promise<void> {
    this.logger.info(this.id, 'Initializing 3-Tier Human Memory Subsystem...');
    this.memoryManager = MemoryManager.getInstance();
    this.status = 'UNINITIALIZED';
  }

  public async start(): Promise<void> {
    this.logger.info(this.id, 'Starting Human Memory Subsystem...');
    try {
      if (this.memoryManager) {
        await this.memoryManager.loadMemories();
      }
      this.status = 'RUNNING';
      this.logger.info(this.id, 'Human Memory Subsystem running.');
    } catch (err: any) {
      this.handleError(err, 'start');
    }
  }

  public async pause(): Promise<void> {
    if (this.memoryManager) {
      await this.memoryManager.saveResumeState();
    }
    this.status = 'PAUSED';
  }

  public async stop(): Promise<void> {
    this.logger.info(this.id, 'Stopping Human Memory Subsystem...');
    if (this.memoryManager) {
      await this.memoryManager.saveResumeState();
      this.memoryManager = null;
    }
    this.status = 'UNINITIALIZED';
  }

  public getMemoryManager(): MemoryManager | null {
    return this.memoryManager;
  }

  public async addMemory(key: string, value: string, category?: MemoryItem['category']): Promise<boolean> {
    if (!this.memoryManager) throw new Error('MemoryModule not active');
    return await this.memoryManager.addMemory(key, value, category);
  }

  public async editMemory(key: string, newValue: string, category?: MemoryItem['category']): Promise<boolean> {
    if (!this.memoryManager) throw new Error('MemoryModule not active');
    return await this.memoryManager.editMemory(key, newValue, category);
  }

  public async deleteMemory(key: string): Promise<boolean> {
    if (!this.memoryManager) throw new Error('MemoryModule not active');
    return await this.memoryManager.deleteMemory(key);
  }

  public async exportMemories(format: 'json' | 'markdown' = 'json'): Promise<string> {
    if (!this.memoryManager) throw new Error('MemoryModule not active');
    return await this.memoryManager.exportMemories(format);
  }
}
