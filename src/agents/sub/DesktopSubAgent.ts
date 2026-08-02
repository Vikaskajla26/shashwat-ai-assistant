/** Desktop SubAgent (Internal Execution Only) */
import { AgentTask } from '../AgentTypes';
import { DesktopAutomationModule } from '../../core/modules/DesktopAutomationModule';

export class DesktopSubAgent {
  private module = new DesktopAutomationModule();

  public async execute(task: AgentTask): Promise<any> {
    await this.module.init();
    await this.module.start();

    if (task.action === 'openApp') return await this.module.openApp(task.payload);
    if (task.action === 'closeApp') return await this.module.closeApp(task.payload);
    if (task.action === 'switchWindow') return await this.module.switchWindow(task.payload);
    if (task.action === 'typeKeyboard') return await this.module.typeKeyboard(task.payload);
    if (task.action === 'writeClipboard') return await this.module.writeClipboard(task.payload);

    return { success: true, message: `Desktop action '${task.action}' completed.` };
  }
}
