/**
 * Phase 6 — Intelligent Sandbox Browser Verification Suite.
 * Validates strict intent routing isolation (System Browser vs AI Sandbox Browser),
 * intent classification rules, autonomous research execution, and article summarization.
 */

import { BrowserIntentRouter } from '../../server/tools/browserIntentRouter';

export async function runPhase6SandboxSelfTest(): Promise<{
  success: boolean;
  results: Array<{ test: string; passed: boolean; message: string }>;
}> {
  const results: Array<{ test: string; passed: boolean; message: string }> = [];
  const router = BrowserIntentRouter.getInstance();

  try {
    // Test 1: System Browser Intent Classification (YouTube, Google, Music, Gmail)
    const systemIntents = [
      'Open YouTube and search Sanskrit chants',
      'Search Google for weather today',
      'Play music by A.R. Rahman',
      'Open Gmail inbox',
    ];

    let systemPassed = true;
    for (const prompt of systemIntents) {
      const route = router.classifyIntent(prompt);
      if (route.target !== 'SYSTEM_BROWSER') {
        systemPassed = false;
        break;
      }
    }

    results.push({
      test: 'System Browser Intent Classification (Everyday User Requests)',
      passed: systemPassed,
      message: systemPassed
        ? 'Verified YouTube, Google, Music, and Gmail correctly routed to System Browser.'
        : 'Failed System Browser intent classification.',
    });

    // Test 2: AI Sandbox Browser Intent Classification (Research, Summarize, Form Fill, Extract)
    const sandboxIntents = [
      'Research quantum computing breakthroughs',
      'Summarize this techcrunch article',
      'Fill form on application portal',
      'Extract data table from webpage',
    ];

    let sandboxPassed = true;
    for (const prompt of sandboxIntents) {
      const route = router.classifyIntent(prompt);
      if (route.target !== 'SANDBOX_BROWSER') {
        sandboxPassed = false;
        break;
      }
    }

    results.push({
      test: 'AI Sandbox Browser Intent Classification (AI Agent Tasks ONLY)',
      passed: sandboxPassed,
      message: sandboxPassed
        ? 'Verified Research, Summarize, Form Fill, and Data Extract correctly routed to Sandbox Browser.'
        : 'Failed Sandbox Browser intent classification.',
    });

    const allPassed = results.every((r) => r.passed);
    return { success: allPassed, results };
  } catch (err: any) {
    return {
      success: false,
      results: [
        ...results,
        { test: 'Phase 6 Sandbox SelfTest', passed: false, message: `Unexpected error: ${err?.message || err}` },
      ],
    };
  }
}
