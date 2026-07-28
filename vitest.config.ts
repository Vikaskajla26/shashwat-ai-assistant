import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node environment — no jsdom needed for pure-logic server tests.
    environment: "node",
    // Include only server-side test files (no browser/renderer tests).
    include: ["server/**/*.test.ts"],
    // Time-box each test to catch hangs.
    testTimeout: 10_000,
    // One at a time to avoid data-dir conflicts (metricsStore, errorIntelStore).
    pool: "forks",
  },
});
