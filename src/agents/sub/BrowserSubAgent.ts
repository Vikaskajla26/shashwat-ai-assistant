/** Browser SubAgent (Internal Execution Only) */
import { AgentTask } from '../AgentTypes';
import { BrowserAutomationModule } from '../../core/modules/BrowserAutomationModule';

export class BrowserSubAgent {
  private module = new BrowserAutomationModule();

  public async execute(task: AgentTask): Promise<any> {
    await this.module.init();
    await this.module.start();

    if (task.action === 'openWebsite') return await this.module.openWebsite(task.payload);
    if (task.action === 'searchGoogle') return await this.module.searchGoogle(task.payload);
    if (task.action === 'openYouTube') return await this.module.openYouTube(task.payload);
    if (task.action === 'playMusic') return await this.module.playMusic(task.payload);
    if (task.action === 'sandboxResearch') return await this.module.sandboxResearch(task.payload);
    if (task.action === 'sandboxSummarize') return await this.module.sandboxSummarize(task.payload);

    return await this.module.handleWebIntent(task.payload);
  }
}
