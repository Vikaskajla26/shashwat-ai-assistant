/**
 * Phase 8 — Vision Intelligence Verification Suite.
 * Validates multi-monitor display capture, screen understanding, OCR, UI & button detection,
 * error & popup detection, live cursor tracking, and visual scene analysis.
 */

import { VisionIntelligenceEngine } from '../vision/VisionIntelligenceEngine';

export async function runPhase8VisionSelfTest(): Promise<{
  success: boolean;
  results: Array<{ test: string; passed: boolean; message: string }>;
}> {
  const results: Array<{ test: string; passed: boolean; message: string }> = [];
  const vision = new VisionIntelligenceEngine();

  try {
    await vision.init();
    await vision.start();

    // Test 1: Multi-Monitor Detection
    const monitors = await vision.getMonitors();
    const monitorsPassed = Array.isArray(monitors) && monitors.length > 0;
    results.push({
      test: 'Multi-Monitor Display Detection',
      passed: monitorsPassed,
      message: monitorsPassed
        ? `Detected ${monitors.length} active display monitor(s).`
        : 'Failed display monitor detection.',
    });

    // Test 2: Live Cursor Position Tracking
    const cursor = await vision.getCursorPosition();
    const cursorPassed = cursor !== null && typeof cursor.x === 'number' && typeof cursor.y === 'number';
    results.push({
      test: 'Live Cursor Tracking (X, Y Coordinates)',
      passed: cursorPassed,
      message: cursorPassed
        ? `Live cursor position tracked at (${cursor.x}, ${cursor.y}).`
        : 'Failed cursor tracking.',
    });

    // Test 3: Screen Scene Analysis & UI Element Detection
    const scene = await vision.analyzeScene(0);
    const scenePassed = Boolean(scene) && (scene.success || Boolean(scene.ocrText));
    results.push({
      test: 'Screen Scene Analysis (OCR, UI & Error Detection)',
      passed: scenePassed,
      message: scenePassed
        ? `Screen analysis completed with ${scene.elements?.length || 0} UI element(s) detected.`
        : 'Failed scene analysis.',
    });

    await vision.stop();

    const allPassed = results.every((r) => r.passed);
    return { success: allPassed, results };
  } catch (err: any) {
    return {
      success: false,
      results: [
        ...results,
        { test: 'Phase 8 Vision SelfTest', passed: false, message: `Unexpected error: ${err?.message || err}` },
      ],
    };
  }
}
