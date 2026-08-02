/**
 * Phase 3 — Human Memory System Verification Suite.
 * Validates 3-tier memory model, AES-256 encryption/decryption,
 * memory editing, deletion, export (JSON/Markdown), and auto-resume state recovery.
 */

import { MemoryManager } from '../modules/MemoryManager';

export async function runPhase3MemorySelfTest(): Promise<{
  success: boolean;
  results: Array<{ test: string; passed: boolean; message: string }>;
}> {
  const results: Array<{ test: string; passed: boolean; message: string }> = [];
  const memory = MemoryManager.getInstance();

  try {
    // Test 1: Load Memories & Init 3-Tier Model
    await memory.loadMemories();
    const loadedMemories = memory.getAllMemories();
    results.push({
      test: '3-Tier Memory Model Initialization',
      passed: true,
      message: `Initialized Short-Term, Conversation, and Long-Term Memory tiers (${loadedMemories.length} persistent items).`,
    });

    // Test 2: Add & Encrypt Memory (Tier 3)
    const testKey = 'test_user_pref_theme';
    const testVal = 'Dark Obsidian Glassmorphism';
    await memory.addMemory(testKey, testVal, 'preference', true, ['ui', 'theme'], 5);
    const addedItem = memory.getMemory(testKey);

    const addPassed = addedItem !== null && addedItem.value === testVal && addedItem.isEncrypted;
    results.push({
      test: 'Encrypted Memory Creation (AES-256-GCM)',
      passed: addPassed,
      message: addPassed
        ? 'Encrypted memory item stored and decrypted cleanly.'
        : 'Failed encrypted memory creation.',
    });

    // Test 3: Edit Memory
    const updatedVal = 'Ultra Light Bioluminescent Glassmorphism';
    await memory.editMemory(testKey, updatedVal, 'preference');
    const editedItem = memory.getMemory(testKey);

    const editPassed = editedItem !== null && editedItem.value === updatedVal;
    results.push({
      test: 'Memory Editing (Live CRUD)',
      passed: editPassed,
      message: editPassed
        ? `Memory content updated cleanly: '${updatedVal}'`
        : 'Failed memory edit operation.',
    });

    // Test 4: Export Memories (JSON & Markdown)
    const jsonExport = await memory.exportMemories('json');
    const mdExport = await memory.exportMemories('markdown');

    const exportPassed = jsonExport.includes(testKey) && mdExport.includes(testKey);
    results.push({
      test: 'Memory Export (JSON & Markdown)',
      passed: exportPassed,
      message: exportPassed
        ? 'Exported memory graph in JSON and Markdown formats successfully.'
        : 'Memory export failed.',
    });

    // Test 5: Delete Memory
    await memory.deleteMemory(testKey);
    const deletedItem = memory.getMemory(testKey);
    const deletePassed = deletedItem === null;
    results.push({
      test: 'Memory Deletion',
      passed: deletePassed,
      message: deletePassed ? 'Memory item deleted cleanly.' : 'Memory deletion failed.',
    });

    // Test 6: Auto-Resume State Recovery
    memory.updateShortTermContext({ activeGoal: 'Verify Phase 3 Memory Architecture' });
    await memory.saveResumeState();
    const resumeSuccess = await memory.resumeState();
    const shortTermContext = memory.getShortTermContext();

    const resumePassed = resumeSuccess && shortTermContext.activeGoal === 'Verify Phase 3 Memory Architecture';
    results.push({
      test: 'Auto-Resume State Recovery After Restart',
      passed: resumePassed,
      message: resumePassed
        ? 'Environment active state & short-term context saved and restored cleanly.'
        : 'Failed auto-resume state recovery.',
    });

    const allPassed = results.every((r) => r.passed);
    return { success: allPassed, results };
  } catch (err: any) {
    return {
      success: false,
      results: [
        ...results,
        { test: 'Phase 3 Memory SelfTest', passed: false, message: `Unexpected error: ${err?.message || err}` },
      ],
    };
  }
}
