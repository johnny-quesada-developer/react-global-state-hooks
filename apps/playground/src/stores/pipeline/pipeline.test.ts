import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { usePipeline } from './pipeline';
import type { Any } from 'react-global-state-hooks/types';

describe('pipeline', () => {
  let capturedState: Any;
  let capturedActions: Any;

  const TestComponent = () => {
    const [state, actions] = usePipeline();
    capturedState = state;
    capturedActions = actions;
    return null;
  };

  beforeEach(() => {
    render(React.createElement(TestComponent));
    // Ensure clean state for each test
    if (capturedActions) {
      capturedActions.reset();
    }
  });

  afterEach(async () => {
    // Ensure we're using real timers to clean up properly
    try {
      vi.useRealTimers();
    } catch {
      // Timers might already be real
    }
  });

  it('initializes with idle stage and empty steps', () => {
    expect(capturedState.stage).toBe('idle');
    expect(capturedState.progress).toBe(0);
    expect(capturedState.steps).toEqual([]);
    expect(capturedState.lastError).toBeNull();
  });

  it('executes runSync action with multiple synchronous setState calls', async () => {
    // Verify initial state
    expect(capturedState.stage).toBe('idle');

    // Call runSync (synchronous, so no await needed)
    capturedActions.runSync();
    // Let React process the state updates via a microtask
    await Promise.resolve();

    // After runSync completes, should be in 'done' stage with progress 100
    expect(capturedState.stage).toBe('done');
    expect(capturedState.progress).toBe(100);
    expect(capturedState.steps).toEqual(['sync: validating', 'sync: processing', 'sync: done']);
    expect(capturedState.lastError).toBeNull();
  });

  it(
    'executes runAsync action with multiple async setState calls and waits',
    async () => {
      // Verify initial state
      expect(capturedState.stage).toBe('idle');

      // Set up fake timers for the async action
      vi.useFakeTimers();

      // Start runAsync action - this begins executing until first await
      const promise = capturedActions.runAsync();
      // Let microtasks execute and the first setState to take effect
      await Promise.resolve();

      // After first setState, should be validating
      expect(capturedState.stage).toBe('validating');
      expect(capturedState.progress).toBe(15);
      expect(capturedState.steps).toEqual(['async: validating']);

      // Fast-forward first wait (500ms)
      await vi.advanceTimersByTimeAsync(500);
      expect(capturedState.stage).toBe('uploading');
      expect(capturedState.progress).toBe(45);
      expect(capturedState.steps).toEqual(['async: validating', 'async: uploading']);

      // Fast-forward second wait (500ms)
      await vi.advanceTimersByTimeAsync(500);
      expect(capturedState.stage).toBe('processing');
      expect(capturedState.progress).toBe(75);
      expect(capturedState.steps).toEqual(['async: validating', 'async: uploading', 'async: processing']);

      // Fast-forward third wait (500ms)
      await vi.advanceTimersByTimeAsync(500);
      expect(capturedState.stage).toBe('finalizing');
      expect(capturedState.progress).toBe(90);
      expect(capturedState.steps).toEqual([
        'async: validating',
        'async: uploading',
        'async: processing',
        'async: finalizing',
      ]);

      // Fast-forward final wait (400ms)
      await vi.advanceTimersByTimeAsync(400);
      expect(capturedState.stage).toBe('done');
      expect(capturedState.progress).toBe(100);
      expect(capturedState.steps).toEqual([
        'async: validating',
        'async: uploading',
        'async: processing',
        'async: finalizing',
        'async: done',
      ]);

      // Verify the return value
      const result = await promise;
      expect(result).toEqual({ success: true });

      vi.useRealTimers();
    },
    { timeout: 10000 },
  );

  it(
    'executes runAsyncFailing action and transitions to failed stage with error',
    async () => {
      // Verify initial state
      expect(capturedState.stage).toBe('idle');

      // Set up fake timers for the async action
      vi.useFakeTimers();

      // Start runAsyncFailing action
      const promise = capturedActions.runAsyncFailing();
      // Let microtasks execute and the first setState to take effect
      await Promise.resolve();

      // After first setState, should be validating
      expect(capturedState.stage).toBe('validating');
      expect(capturedState.progress).toBe(20);
      expect(capturedState.steps).toEqual(['async-fail: validating']);
      expect(capturedState.lastError).toBeNull();

      // Fast-forward first wait (500ms)
      await vi.advanceTimersByTimeAsync(500);
      expect(capturedState.stage).toBe('uploading');
      expect(capturedState.progress).toBe(60);
      expect(capturedState.steps).toEqual(['async-fail: validating', 'async-fail: uploading']);

      // Fast-forward second wait (500ms)
      await vi.advanceTimersByTimeAsync(500);
      expect(capturedState.stage).toBe('failed');
      expect(capturedState.progress).toBe(60);
      expect(capturedState.steps).toEqual([
        'async-fail: validating',
        'async-fail: uploading',
        'async-fail: failed',
      ]);
      expect(capturedState.lastError).toBe('Upload rejected by server');

      // Verify the return value
      const result = await promise;
      expect(result).toEqual({ success: false, error: 'Upload rejected by server' });

      vi.useRealTimers();
    },
    { timeout: 10000 },
  );

  it('reset action restores initial state', async () => {
    // Run sync to change state
    capturedActions.runSync();
    await Promise.resolve();
    expect(capturedState.stage).toBe('done');
    expect(capturedState.progress).toBe(100);
    expect(capturedState.steps.length).toBeGreaterThan(0);

    // Reset should restore initial state
    capturedActions.reset();
    await Promise.resolve();
    expect(capturedState.stage).toBe('idle');
    expect(capturedState.progress).toBe(0);
    expect(capturedState.steps).toEqual([]);
    expect(capturedState.lastError).toBeNull();
  });
});
