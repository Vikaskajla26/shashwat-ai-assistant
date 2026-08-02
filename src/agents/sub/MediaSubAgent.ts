/** Media SubAgent (Internal Execution Only) */
import { AgentTask } from '../AgentTypes';
import { DesktopAutomationModule } from '../../core/modules/DesktopAutomationModule';

export class MediaSubAgent {
  private desktop = new DesktopAutomationModule();

  public async execute(task: AgentTask): Promise<any> {
    await this.desktop.init();
    await this.desktop.start();
    const action = String(task.payload || 'mute');
    return await this.desktop.mediaControl(action);
  }
}
