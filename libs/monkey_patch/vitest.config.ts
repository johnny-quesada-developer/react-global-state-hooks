import { defineConfig } from 'vitest/config';

// Project layout lives in vitest.workspace.ts (three projects: unit, shared-universal,
// shared-web). This root config only carries settings shared across the whole run. Aliases and
// per-project include/setup are defined per project in the workspace file.
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
