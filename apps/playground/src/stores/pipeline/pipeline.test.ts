import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { usePipeline } from './pipeline';

describe('pipeline', () => {
  let capturedState: any;
  let capturedActions: any;

  const TestComponent = () => {
    const [state, actions] = usePipeline();
    capturedState = state;
    capturedActions = actions;
    return null;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    render(React.createElement(TestComponent));
    // Ensure clean state for each test
    if (capturedActions) {
      capturedActions.reset();
    }
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('initializes with idle stage and empty steps', () => {
    expect(capturedState.stage).toBe('idle');
    expect(capturedState.progress).toBe(0);
    expect(capturedState.steps).toEqual([]);
    expect(capturedState.lastError).toBeNull();
  });

  it('executes runSync action with multiple synchronous setState calls', () => {
    // Verify initial state
    expect(capturedState.stage).toBe('idle');

    // Call runSync
    capturedActions.runSync();

    // After runSync completes, should be in 'done' stage with progress 100
    expect(capturedState.stage).toBe('done');
    expect(capturedState.progress).toBe(100);
    expect(capturedState.steps).toEqual([
      'sync: validating',
      'sync: processing',
      'sync: done',
    ]);
    expect(capturedState.lastError).toBeNull();
  });

  it('executes runAsync action with multiple async setState calls and waits', async () => {
    // Verify initial state
    expect(capturedState.stage).toBe('idle');

    // Start runAsync action
    const promise = capturedActions.runAsync();

    // After first setState, should be validating
    expect(capturedState.stage).toBe('validating');
    expect(capturedState.progress).toBe(15);
    expect(capturedState.steps).toEqual(['async: validating']);

    // Fast-forward first wait
    await vi.advanceTimersByTimeAsync(500);
    expect(capturedState.stage).toBe('uploading');
    expect(capturedState.progress).toBe(45);
    expect(capturedState.steps).toEqual(['async: validating', 'async: uploading']);

    // Fast-forward second wait
    await vi.advanceTimersByTimeAsync(500);
    expect(capturedState.stage).toBe('processing');
    expect(capturedState.progress).toBe(75);
    expect(capturedState.steps).toEqual([
      'async: validating',
      'async: uploading',
      'async: processing',
    ]);

    // Fast-forward third wait
    await vi.advanceTimersByTimeAsync(500);
    expect(capturedState.stage).toBe('finalizing');
    expect(capturedState.progress).toBe(90);
    expect(capturedState.steps).toEqual([
      'async: validating',
      'async: uploading',
      'async: processing',
      'async: finalizing',
    ]);

    // Fast-forward final wait
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
  });

  it('executes runAsyncFailing action and transitions to failed stage with error', async () => {
    // Verify initial state
    expect(capturedState.stage).toBe('idle');

    // Start runAsyncFailing action
    const promise = capturedActions.runAsyncFailing();

    // After first setState, should be validating
    expect(capturedState.stage).toBe('validating');
    expect(capturedState.progress).toBe(20);
    expect(capturedState.steps).toEqual(['async-fail: validating']);
    expect(capturedState.lastError).toBeNull();

    // Fast-forward first wait
    await vi.advanceTimersByTimeAsync(500);
    expect(capturedState.stage).toBe('uploading');
    expect(capturedState.progress).toBe(60);
    expect(capturedState.steps).toEqual(['async-fail: validating', 'async-fail: uploading']);

    // Fast-forward second wait
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
  });

  it('reset action restores initial state', () => {
    // Run sync to change state
    capturedActions.runSync();
    expect(capturedState.stage).toBe('done');
    expect(capturedState.progress).toBe(100);
    expect(capturedState.steps.length).toBeGreaterThan(0);

    // Reset should restore initial state
    capturedActions.reset();
    expect(capturedState.stage).toBe('idle');
    expect(capturedState.progress).toBe(0);
    expect(capturedState.steps).toEqual([]);
    expect(capturedState.lastError).toBeNull();
  });
});
