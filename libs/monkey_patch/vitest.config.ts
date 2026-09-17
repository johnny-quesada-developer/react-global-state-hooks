import { defineConfig } from 'vitest/config';

// Project layout lives in vitest.workspace.ts (four projects: unit, patched-universal,
// patched-web, patched-native). This root config only carries settings shared across the whole
// run. Aliases and per-project include/setup are defined per project in the workspace file.
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    // Minimal per-test output: with this many tests the default verbose reporter dominates runtime.
    reporters: ['dot'],
    // Run at least 4 workers so the four projects can execute concurrently. Worker/pool settings
    // are honored at the ROOT config level in workspace mode (per-project overrides are ignored),
    // so they live here. The host has plenty of cores; 4 is the floor, matching the project count.
    minWorkers: 4,
    maxWorkers: 6,
  },
});
