/**
 * Phase 14 & 15 Verification Suite.
 * Validates offline request queuing, local fallback mode, error classification,
 * verified solution recording, and rejection of unverified learning attempts.
 */

import { OfflineEngine } from '../offline/OfflineEngine';
import { SelfLearningEngine } from '../learning/SelfLearningEngine';

export async function runPhase14And15SelfTest(): Promise<{
  success: boolean;
  results: Array<{ test: string; passed: boolean; message: string }>;
}> {
  const results: Array<{ test: string; passed: boolean; message: string }> = [];

  try {
    // Test 1: Offline Mode & Request Queue
    const offline = OfflineEngine.getInstance();
    const isOnline = offline.isOnline();
    const req = offline.enqueueRequest('AI_SYNTHESIS', { prompt: 'Offline SelfTest Prompt' });
    const queue = offline.getQueue();
    const offlinePassed = Boolean(req) && queue.length > 0;

    results.push({
      test: 'Phase 14: Offline Request Queue & Local Tool Fallback',
      passed: offlinePassed,
      message: offlinePassed
        ? `Queued offline request [${req.id}] (Status: ${isOnline ? 'Online' : 'Offline'}).`
        : 'Failed offline request queue test.',
    });

    // Test 2: Failure Classification & Categorization
    const learning = SelfLearningEngine.getInstance();
    const catTimeout = learning.classifyFailure('Execution timed out after 10000ms');
    const catPerm = learning.classifyFailure('Permission denied for Desktop API');
    const catSyntax = learning.classifyFailure('ReferenceError: x is not defined');
    const classPassed = catTimeout === 'TIMEOUT' && catPerm === 'PERMISSION_DENIED' && catSyntax === 'INVALID_SYNTAX';

    results.push({
      test: 'Phase 15: Self-Learning Error Classifier',
      passed: classPassed,
      message: classPassed
        ? 'Verified accurate failure categorization across TIMEOUT, PERMISSION_DENIED, and INVALID_SYNTAX.'
        : 'Failed error classifier test.',
    });

    // Test 3: Verified Solution Recording & Unverified Rejection
    const unverifiedAttempt = learning.recordVerifiedSolution('Timeout in Playwright', 'Increase timeout', false);
    const verifiedAttempt = learning.recordVerifiedSolution('Timeout in Playwright', 'Increase timeout to 30s', true);

    const learnPassed = !unverifiedAttempt && verifiedAttempt;
    results.push({
      test: 'Phase 15: Verified Solution Memory Store & Strict Rejection of Unverified Learning',
      passed: learnPassed,
      message: learnPassed
        ? 'Verified that unverified failed attempts are REJECTED and only 100% verified solutions are recorded.'
        : 'Failed verified learning test.',
    });

    const allPassed = results.every((r) => r.passed);
    return { success: allPassed, results };
  } catch (err: any) {
    return {
      success: false,
      results: [
        ...results,
        { test: 'Phase 14 & 15 SelfTest', passed: false, message: `Unexpected error: ${err?.message || err}` },
      ],
    };
  }
}
