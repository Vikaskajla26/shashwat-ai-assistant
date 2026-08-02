import { OrbInteraction } from './interaction';

export class OrbPhysics {
  private interaction: OrbInteraction;

  constructor() {
    this.interaction = new OrbInteraction();
  }

  public attach() {
    this.interaction.attach();
  }

  public detach() {
    this.interaction.detach();
  }

  public step(dt: number, t: number) {
    return this.interaction.step(dt, t);
  }
}
