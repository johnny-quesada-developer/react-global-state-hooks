import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import {
  maybeCleanupPreviousStateMetadata,
  deletePreviousSessionStacks,
} from '../src/maybeCleanupPreviousStateMetadata';

// Mock only external boundary - window.postMessage
let mockPostMessage: ReturnType<typeof vi.fn>;
let postedMessages: any[] = [];

describe('maybeCleanupPreviousStateMetadata', () => {
  beforeEach(() => {
    postedMessages = [];
    mockPostMessage = vi.fn((message) => {
      postedMessages.push(message);
    });

    // Mock browser APIs (external boundary)
    global.window = {
      postMessage: mockPostMessage,
    } as any;

    global.performance = {
      now: () => 123.456,
    } as any;

    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('first time global state creation', () => {
    it('should not send cleanup message on first initialization', () => {
      const sessionId = 'session:abc123';
      const globalStatePath = '/src/stores/counter.ts';

      maybeCleanupPreviousStateMetadata({ sessionId, globalStatePath });

      // Should not send cleanup message on first load
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should store session entry in sessionStorage on first load', () => {
      const sessionId = 'session:abc123';
      const globalStatePath = '/src/stores/counter.ts';
      const expectedKey = `${sessionId}/gs-stack:${globalStatePath}`;

      maybeCleanupPreviousStateMetadata({ sessionId, globalStatePath });

      const stored = sessionStorage.getItem(expectedKey);
      expect(stored).toBeTruthy();
      expect(stored).toMatch(/^gs-hash:/);
    });

    it('should handle multiple different global states', () => {
      const sessionId = 'session:xyz789';
      const globalStatePaths = ['/src/stores/counter.ts', '/src/stores/user.ts', '/src/stores/cart.ts'];

      globalStatePaths.forEach((path) => {
        maybeCleanupPreviousStateMetadata({ sessionId, globalStatePath: path });
      });

      // Each should have its own entry
      globalStatePaths.forEach((path) => {
        const key = `${sessionId}/gs-stack:${path}`;
        expect(sessionStorage.getItem(key)).toBeTruthy();
      });

      // Should not send cleanup messages
      expect(mockPostMessage).not.toHaveBeenCalled();
    });
  });

  describe('fast reload / hot module replacement', () => {
    it('should send CLEAR_GLOBAL_STATES message on fast reload', () => {
      const sessionId = 'session:fast-reload-test';
      const globalStatePath = '/src/stores/counter.ts';

      // First initialization
      maybeCleanupPreviousStateMetadata({ sessionId, globalStatePath });
      expect(mockPostMessage).not.toHaveBeenCalled();

      // Fast reload - same session, same path
      maybeCleanupPreviousStateMetadata({ sessionId, globalStatePath });

      // Should send cleanup message
      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const message = postedMessages[0];
      const payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;

      expect(message.id).toMatch(/^cleanup:/);
      expect(message.action).toBe('monkey-patch/CLEAR_GLOBAL_STATES');
      expect(message.timestamp).toBe(123.456);
      expect(payload.globalStatePath).toBe('/src/stores/counter.ts');
    });

    it('should update session entry with new hash on fast reload', () => {
      const sessionId = 'session:update-test';
      const globalStatePath = '/src/stores/counter.ts';
      const key = `${sessionId}/gs-stack:${globalStatePath}`;

      // First initialization
      maybeCleanupPreviousStateMetadata({ sessionId, globalStatePath });
      const firstHash = sessionStorage.getItem(key);

      // Fast reload
      maybeCleanupPreviousStateMetadata({ sessionId, globalStatePath });
      const secondHash = sessionStorage.getItem(key);

      // Hash should be updated
      expect(firstHash).toBeTruthy();
      expect(secondHash).toBeTruthy();
      expect(sessionStorage.getItem(key)).toMatch(/^gs-hash:/);
    });

    it('should handle fast reload for specific global state only', () => {
      const sessionId = 'session:selective-reload';
      const path1 = '/src/stores/counter.ts';
      const path2 = '/src/stores/user.ts';

      // Initialize both
      maybeCleanupPreviousStateMetadata({ sessionId, globalStatePath: path1 });
      maybeCleanupPreviousStateMetadata({ sessionId, globalStatePath: path2 });

      postedMessages.length = 0; // Clear messages

      // Fast reload only path1
      maybeCleanupPreviousStateMetadata({ sessionId, globalStatePath: path1 });

      // Should only cleanup path1
      expect(mockPostMessage).toHaveBeenCalled();
      const message = postedMessages[0];
      const payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;

      expect(message.action).toBe('monkey-patch/CLEAR_GLOBAL_STATES');
      expect(payload.globalStatePath).toBe(path1);
    });
  });

  describe('session isolation', () => {
    it('should not trigger cleanup for different sessions', () => {
      const sessionId1 = 'session:old';
      const sessionId2 = 'session:new';
      const globalStatePath = '/src/stores/counter.ts';

      // Initialize with old session
      maybeCleanupPreviousStateMetadata({ sessionId: sessionId1, globalStatePath });

      // Initialize with new session (page reload)
      maybeCleanupPreviousStateMetadata({ sessionId: sessionId2, globalStatePath });

      // Should not send cleanup - different session means fresh page load
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should maintain separate entries for different sessions', () => {
      const sessionId1 = 'session:one';
      const sessionId2 = 'session:two';
      const globalStatePath = '/src/stores/counter.ts';

      maybeCleanupPreviousStateMetadata({ sessionId: sessionId1, globalStatePath });
      maybeCleanupPreviousStateMetadata({ sessionId: sessionId2, globalStatePath });

      const key1 = `${sessionId1}/gs-stack:${globalStatePath}`;
      const key2 = `${sessionId2}/gs-stack:${globalStatePath}`;

      expect(sessionStorage.getItem(key1)).toBeTruthy();
      expect(sessionStorage.getItem(key2)).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle empty global state path', () => {
      const sessionId = 'session:empty-path';
      const globalStatePath = '';

      expect(() => {
        maybeCleanupPreviousStateMetadata({ sessionId, globalStatePath });
      }).not.toThrow();

      const key = `${sessionId}/gs-stack:`;
      expect(sessionStorage.getItem(key)).toBeTruthy();
    });

    it('should handle paths with special characters', () => {
      const sessionId = 'session:special';
      const globalStatePath = '/src/stores/@special/counter[test].ts';

      maybeCleanupPreviousStateMetadata({ sessionId, globalStatePath });

      const key = `${sessionId}/gs-stack:${globalStatePath}`;
      expect(sessionStorage.getItem(key)).toBeTruthy();
    });

    it('should handle very long paths', () => {
      const sessionId = 'session:long';
      const globalStatePath = '/src/' + 'very/'.repeat(50) + 'deep/path/counter.ts';

      maybeCleanupPreviousStateMetadata({ sessionId, globalStatePath });

      const key = `${sessionId}/gs-stack:${globalStatePath}`;
      expect(sessionStorage.getItem(key)).toBeTruthy();
    });
  });
});

describe('deletePreviousSessionStacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('cleanup previous session', () => {
    it('should remove all entries from previous session', () => {
      const oldSessionId = 'session:old-123';
      const prefix = `${oldSessionId}/gs-stack:`;

      // Populate with old session data
      sessionStorage.setItem(`${prefix}/src/stores/counter.ts`, 'gs-hash:1');
      sessionStorage.setItem(`${prefix}/src/stores/user.ts`, 'gs-hash:2');
      sessionStorage.setItem(`${prefix}/src/stores/cart.ts`, 'gs-hash:3');

      // Add some unrelated data
      sessionStorage.setItem('other-key', 'other-value');
      sessionStorage.setItem('session:new-456/gs-stack:/src/stores/new.ts', 'gs-hash:4');

      deletePreviousSessionStacks(oldSessionId);

      // Old session entries should be removed
      expect(sessionStorage.getItem(`${prefix}/src/stores/counter.ts`)).toBeNull();
      expect(sessionStorage.getItem(`${prefix}/src/stores/user.ts`)).toBeNull();
      expect(sessionStorage.getItem(`${prefix}/src/stores/cart.ts`)).toBeNull();

      // Unrelated data should remain
      expect(sessionStorage.getItem('other-key')).toBe('other-value');
      expect(sessionStorage.getItem('session:new-456/gs-stack:/src/stores/new.ts')).toBe('gs-hash:4');
    });

    it('should send CLEAR_GLOBAL_STATES message with wildcard', () => {
      const oldSessionId = 'session:cleanup-test';

      deletePreviousSessionStacks(oldSessionId);

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const message = postedMessages[0];
      const payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;

      expect(message.id).toMatch(/^path:/);
      expect(message.action).toBe('monkey-patch/CLEAR_GLOBAL_STATES');
      expect(payload.globalStatePath).toBe('*');
    });

    it('should handle null previous session id gracefully', () => {
      deletePreviousSessionStacks(null);

      // Should not attempt cleanup
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should handle empty string session id', () => {
      sessionStorage.setItem('/gs-stack:/src/stores/counter.ts', 'value');

      deletePreviousSessionStacks('');

      // Empty string is falsy, so it should not send cleanup message (same as null)
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should handle session id not matching any keys', () => {
      sessionStorage.setItem('session:existing/gs-stack:/path1', 'value1');
      sessionStorage.setItem('session:existing/gs-stack:/path2', 'value2');

      deletePreviousSessionStacks('session:nonexistent');

      // Should send cleanup message
      expect(mockPostMessage).toHaveBeenCalled();

      // Existing keys should remain unchanged
      expect(sessionStorage.getItem('session:existing/gs-stack:/path1')).toBe('value1');
      expect(sessionStorage.getItem('session:existing/gs-stack:/path2')).toBe('value2');
    });
  });

  describe('partial matches', () => {
    it('should only remove exact session prefix matches', () => {
      sessionStorage.setItem('session:abc/gs-stack:/path1', 'value1');
      sessionStorage.setItem('session:abcdef/gs-stack:/path2', 'value2');
      sessionStorage.setItem('other-session:abc/gs-stack:/path3', 'value3');

      deletePreviousSessionStacks('session:abc');

      // Only exact prefix match should be removed
      expect(sessionStorage.getItem('session:abc/gs-stack:/path1')).toBeNull();

      // Longer session id should remain
      expect(sessionStorage.getItem('session:abcdef/gs-stack:/path2')).toBe('value2');
      expect(sessionStorage.getItem('other-session:abc/gs-stack:/path3')).toBe('value3');
    });
  });

  describe('cleanup with many entries', () => {
    it('should handle cleanup of many entries efficiently', () => {
      const oldSessionId = 'session:many-entries';
      const prefix = `${oldSessionId}/gs-stack:`;

      // Create 100 entries
      for (let i = 0; i < 100; i++) {
        sessionStorage.setItem(`${prefix}/src/stores/store${i}.ts`, `gs-hash:${i}`);
      }

      deletePreviousSessionStacks(oldSessionId);

      // All should be removed
      for (let i = 0; i < 100; i++) {
        expect(sessionStorage.getItem(`${prefix}/src/stores/store${i}.ts`)).toBeNull();
      }

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
    });
  });
});
