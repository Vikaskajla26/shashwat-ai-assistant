/** Memory SubAgent (Internal Execution Only) */
import { AgentTask } from '../AgentTypes';
import { MemoryManager } from '../../modules/MemoryManager';

export class MemorySubAgent {
  private memory = MemoryManager.getInstance();

  public async execute(task: AgentTask): Promise<any> {
    await this.memory.loadMemories();

    if (task.action === 'addMemory') {
      const { key, value, category } = task.payload || {};
      return await this.memory.addMemory(key || 'fact', value || String(task.payload), category);
    }
    if (task.action === 'exportMemories') {
      return await this.memory.exportMemories('json');
    }

    return this.memory.getAllMemories();
  }
}
