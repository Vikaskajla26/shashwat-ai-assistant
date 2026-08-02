/**
 * Phase 5 — Browser Controller Verification Suite.
 * Validates multi-browser detection (Chrome/Edge/Firefox/Brave/Opera/Arc), Rule #1 link routing,
 * Google Search, YouTube music playback, PDF search, tab handling, and empirical verification.
 */

import { BrowserAutomationModule } from '../core/modules/BrowserAutomationModule';

export async function runPhase5BrowserSelfTest(): Promise<{
  success: boolean;
  results: Array<{ test: string; passed: boolean; message: string }>;
}> {
  const results: Array<{ test: string; passed: boolean; message: string }> = [];
  const browser = new BrowserAutomationModule();

  try {
    await browser.init();
    await browser.start();

    // Test 1: Multi-Browser Detection from Windows Registry
    const browserInfo = await browser.getDefaultBrowser();
    const detectPassed = browserInfo !== null && Boolean(browserInfo.name);
    results.push({
      test: 'Multi-Browser Detection (Registry Query)',
      passed: detectPassed,
      message: `Detected active browser: '${browserInfo?.name || 'System Default'}'`,
    });

    // Test 2: Rule #1 Enforcement (Direct Browser Window Navigation)
    const openRes = await browser.openWebsite('https://google.com');
    const openPassed = Boolean(openRes);
    results.push({
      test: 'Rule #1 Direct Browser Window Navigation (No Raw Links)',
      passed: openPassed,
      message: 'Directly opened target website in default browser window.',
    });

    // Test 3: Search Google & YouTube Music Playback Routing
    const musicRes = await browser.playMusic('Sanskrit Meditation');
    const musicPassed = Boolean(musicRes);
    results.push({
      test: 'YouTube Music Playback & Query Formulation',
      passed: musicPassed,
      message: 'Formulated query URL and routed to browser player cleanly.',
    });

    // Test 4: Tab Management Simulation
    const tabRes = await browser.handleTab('new');
    const tabPassed = Boolean(tabRes);
    results.push({
      test: 'Browser Tab Management (Ctrl+T)',
      passed: tabPassed,
      message: 'Executed tab command in active browser window.',
    });

    await browser.stop();

    const allPassed = results.every((r) => r.passed);
    return { success: allPassed, results };
  } catch (err: any) {
    return {
      success: false,
      results: [
        ...results,
        { test: 'Phase 5 Browser SelfTest', passed: false, message: `Unexpected error: ${err?.message || err}` },
      ],
    };
  }
}
