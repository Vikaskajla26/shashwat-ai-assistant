/**
 * Self Learning System Storage & Export/Import Manager
 * Manages persistent local memory of task records, error logs, verified solutions,
 * learned macro workflows, user preferences, and rollback snapshots across page refreshes.
 */

import { LearningSystemState, INITIAL_LEARNING_STATE, TaskRecord, ErrorRecord, SolutionRecord } from '../../server/selfLearningEngine';

const LEARNING_KEY = 'shashwat_self_learning_v1';

export function getStoredLearningState(): LearningSystemState {
  try {
    const raw = localStorage.getItem(LEARNING_KEY);
    if (!raw) {
      saveStoredLearningState(INITIAL_LEARNING_STATE);
      return INITIAL_LEARNING_STATE;
    }
    return JSON.parse(raw) as LearningSystemState;
  } catch (err) {
    console.error('[SelfLearningStorage] Failed to read learning state:', err);
    return INITIAL_LEARNING_STATE;
  }
}

export function saveStoredLearningState(state: LearningSystemState): void {
  try {
    localStorage.setItem(LEARNING_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('[SelfLearningStorage] Failed to save learning state:', err);
  }
}

export function resetStoredLearningState(): void {
  try {
    localStorage.removeItem(LEARNING_KEY);
    saveStoredLearningState(INITIAL_LEARNING_STATE);
  } catch (err) {
    console.error('[SelfLearningStorage] Failed to reset learning state:', err);
  }
}

export function exportLearningDatabase(state: LearningSystemState): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `Shashwat_Self_Learning_Database_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
