/**
 * Backend Offline & Learning Manager Engine (Phases 14 & 15).
 */

import { OfflineEngine } from '../../src/offline/OfflineEngine';
import { SelfLearningEngine } from '../../src/learning/SelfLearningEngine';

export class OfflineManagerEngine {
  private static instance: OfflineManagerEngine | null = null;

  private constructor() {}

  public static getInstance(): OfflineManagerEngine {
    if (!OfflineManagerEngine.instance) {
      OfflineManagerEngine.instance = new OfflineManagerEngine();
    }
    return OfflineManagerEngine.instance;
  }

  public getOfflineStatus() {
    return OfflineEngine.getInstance().isOnline();
  }

  public getQueue() {
    return OfflineEngine.getInstance().getQueue();
  }

  public getVerifiedInsights() {
    return SelfLearningEngine.getInstance().getAllInsights();
  }

  public recordVerifiedSolution(pattern: string, solution: string, verified: boolean) {
    return SelfLearningEngine.getInstance().recordVerifiedSolution(pattern, solution, verified);
  }
}
