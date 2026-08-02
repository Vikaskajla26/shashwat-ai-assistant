import type { AssistantState } from '../../types';
import type { StateTheme } from '../../theme/aiState';
import { getStateTheme } from '../../theme/aiState';
import { StateInterpolator } from '../../engine/state/StateInterpolator';

export class OrbState {
  private interpolator: StateInterpolator;
  private currentTheme: StateTheme;

  constructor(initialState: AssistantState = 'idle') {
    this.interpolator = StateInterpolator.getInstance();
    this.interpolator.setTargetState(initialState);
    this.currentTheme = getStateTheme(initialState);
  }

  public update(state: AssistantState, dt: number): StateTheme {
    this.interpolator.setTargetState(state);
    this.currentTheme = this.interpolator.update(dt);
    return this.currentTheme;
  }

  public getTheme(): StateTheme {
    return this.currentTheme;
  }
}
