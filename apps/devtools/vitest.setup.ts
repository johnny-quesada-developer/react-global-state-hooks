import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup rendered React trees after each test.
afterEach(() => {
  cleanup();
});

// Minimal chrome API stub for tests that touch the extension surface.
(global as unknown as { chrome: unknown }).chrome = {
  devtools: {
    inspectedWindow: {
      tabId: 1,
    },
  },
  runtime: {
    onConnect: {
      addListener: vi.fn(),
    },
  },
};
