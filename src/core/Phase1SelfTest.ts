/**
 * Phase 1 — Core AI Foundation Verification Suite.
 * Validates module independence, EventBus error isolation, logger scrubbing,
 * and Supervisor independent module crash recovery.
 */

import { ShashwatCore } from './ShashwatCore';
import { EventBus } from './EventBus';
import { CentralLogger } from './CentralLogger';
import { Supervisor } from './Supervisor';
import { HealthMonitor } from './HealthMonitor';

export async function runPhase1SelfTest(): Promise<{
  success: boolean;
  results: Array<{ test: string; passed: boolean; message: string }>;
}> {
  const results: Array<{ test: string; passed: boolean; message: string }> = [];
  const core = ShashwatCore.getInstance();

  try {
    // Test 1: Kernel Boot & Module Registration
    await core.boot();
    const modules = core.moduleManager.getAllModules();
    const isBooted = modules.length >= 7;
    results.push({
      test: 'Kernel Boot & Module Registration',
      passed: isBooted,
      message: `Registered ${modules.length}/7 core modules. Status: ${isBooted ? 'PASS' : 'FAIL'}`,
    });

    // Test 2: EventBus Error Isolation
    const bus = EventBus.getInstance();
    let listenerCount = 0;

    bus.on('test:isolation', () => {
      listenerCount++;
      throw new Error('Intentionally crashing listener');
    });

    bus.on('test:isolation', () => {
      listenerCount++;
    });

    bus.emit('test:isolation', { data: 'test' });
    const isolationPassed = listenerCount === 2;
    results.push({
      test: 'EventBus Subscriber Error Isolation',
      passed: isolationPassed,
      message: isolationPassed
        ? 'Faulty subscriber error was isolated; healthy subscriber executed cleanly.'
        : 'EventBus failed subscriber error isolation.',
    });

    // Test 3: CentralLogger Sensitive Key Scrubbing
    const logger = CentralLogger.getInstance();
    const fakeKey = 'AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P';
    logger.info('TestModule', `Connected with key: ${fakeKey}`, { api_key: fakeKey });
    const logs = logger.getRecentLogs();
    const lastLog = logs[logs.length - 1];
    const isScrubbed = !lastLog.message.includes(fakeKey) && lastLog.data?.api_key === '********[RESTRICTED]********';
    results.push({
      test: 'CentralLogger Sensitive Data Scrubbing',
      passed: isScrubbed,
      message: isScrubbed
        ? 'Sensitive API key was automatically scrubbed from message & data.'
        : 'Sensitive data masking failed.',
    });

    // Test 4: Health Monitor Diagnostic Telemetry
    const report = await HealthMonitor.getInstance().getDiagnostics();
    const healthPassed = report.overallStatus === 'HEALTHY' && report.activeModulesCount >= 7;
    results.push({
      test: 'Health Monitor System Diagnostics',
      passed: healthPassed,
      message: `Overall Status: ${report.overallStatus}, Active Modules: ${report.activeModulesCount}`,
    });

    // Test 5: Supervisor Independent Module Crash Recovery
    const voiceMod = core.moduleManager.getModule('voice');
    const aiMod = core.moduleManager.getModule('ai_engine');

    if (voiceMod && aiMod) {
      // Simulate VoiceModule fault
      const prevVoiceStatus = voiceMod.getStatus();
      bus.emit('module:error', { moduleId: 'voice', error: 'Simulated microphone hardware disconnect' }, 'voice');
      
      const aiStatusIntact = aiMod.getStatus() === 'RUNNING';
      results.push({
        test: 'Supervisor Module Failure Isolation',
        passed: aiStatusIntact,
        message: aiStatusIntact
          ? `VoiceModule fault isolated. AI Engine Module status remained unaffected (${aiMod.getStatus()}).`
          : 'Module failure leaked across boundaries.',
      });
    }

    const allPassed = results.every((r) => r.passed);
    logger.info('SelfTest', `Phase 1 Core AI Foundation Verification finished. Score: ${results.filter((r) => r.passed).length}/${results.length}`);

    return { success: allPassed, results };
  } catch (err: any) {
    return {
      success: false,
      results: [
        ...results,
        { test: 'SelfTest Execution', passed: false, message: `Unexpected error: ${err?.message || err}` },
      ],
    };
  }
}
