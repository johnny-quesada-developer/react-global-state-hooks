import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock chrome API for tests
(global as any).chrome = {
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
