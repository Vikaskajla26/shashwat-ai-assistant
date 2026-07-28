/**
 * Four Cooperating Systems Storage & Persistence Manager
 * Manages persistent local memory for Experience Memory, Error Intelligence,
 * Workflow Learning, and Improvement Engine across page refreshes.
 */

import type { FourSystemsLearningState } from '../../server/selfLearningEngine';

const FOUR_SYSTEMS_KEY = 'shashwat_four_systems_learning_v1';

export const INITIAL_FOUR_SYSTEMS_STATE: FourSystemsLearningState = {
  system1ExperienceMemory: {
    totalTasksExecuted: 0,
    averageExecutionTimeMs: 0,
    overallSuccessRate: 1.0,
    topSuccessfulTasks: [],
    recentTaskRuns: [],
  },
  system2ErrorIntelligence: {
    totalErrorsAnalyzed: 0,
    groupedErrorPatternsCount: 0,
    verifiedFixesCount: 0,
    recentRootCauseLogs: [],
    activeVerifiedFixes: [],
  },
  system3WorkflowLearning: {
    totalWorkflowsDiscovered: 0,
    activeMacrosCount: 0,
    detectedSequences: [],
  },
  system4ImprovementEngine: {
    overallSystemHealth: 1.0,
    validationTestsPassed: 0,
    validationTestsFailed: 0,
    recentProposalReports: [],
  },
};

export function getStoredFourSystemsState(): FourSystemsLearningState {
  try {
    const raw = localStorage.getItem(FOUR_SYSTEMS_KEY);
    if (!raw) {
      return INITIAL_FOUR_SYSTEMS_STATE;
    }
    return JSON.parse(raw) as FourSystemsLearningState;
  } catch (err) {
    console.error('[FourSystemsStorage] Failed to read learning state:', err);
    return INITIAL_FOUR_SYSTEMS_STATE;
  }
}

export async function fetchLiveLearningState(): Promise<FourSystemsLearningState> {
  try {
    const res = await fetch('/api/learning');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.success) {
      const liveState: FourSystemsLearningState = {
        system1ExperienceMemory: data.system1ExperienceMemory,
        system2ErrorIntelligence: data.system2ErrorIntelligence,
        system3WorkflowLearning: data.system3WorkflowLearning,
        system4ImprovementEngine: data.system4ImprovementEngine,
      };
      saveStoredFourSystemsState(liveState);
      return liveState;
    }
  } catch (err) {
    console.warn('[FourSystemsStorage] Failed to fetch live state, using cache:', err);
  }
  return getStoredFourSystemsState();
}

export function saveStoredFourSystemsState(state: FourSystemsLearningState): void {
  try {
    localStorage.setItem(FOUR_SYSTEMS_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('[FourSystemsStorage] Failed to save learning state:', err);
  }
}

export function resetStoredFourSystemsState(): void {
  try {
    localStorage.removeItem(FOUR_SYSTEMS_KEY);
    saveStoredFourSystemsState(INITIAL_FOUR_SYSTEMS_STATE);
  } catch (err) {
    console.error('[FourSystemsStorage] Failed to reset learning state:', err);
  }
}

export function exportFourSystemsDatabase(state: FourSystemsLearningState): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `Shashwat_Four_Systems_Learning_DB_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
