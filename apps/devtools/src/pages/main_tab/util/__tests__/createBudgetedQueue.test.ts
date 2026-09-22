import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createBudgetedQueue } from '../createBudgetedQueue';

/**
 * We drive time deterministically:
 *  - performance.now() returns a controllable `clock` value.
 *  - vi.useFakeTimers() controls setTimeout, and each timer callback we manually advance the clock
 *    to when it was scheduled to fire, so the queue sees the expected time.
 */
let clock = 0;

const advanceClock = (ms: number) => {
  clock += ms;
};

beforeEach(() => {
  clock = 0;
  vi.useFakeTimers();
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// Runs any pending setTimeout(s): advance the clock to their delay, then fire them.
const flushTimers = () => {
  // The queue schedules a single resume timer at a time; run them until none remain.
  let guard = 0;
  while (vi.getTimerCount() > 0 && guard++ < 100) {
    const before = vi.getTimerCount();
    // The queue always schedules its resume to land at the next cycle boundary; simulate the
    // wall clock reaching that point by advancing to just past the current cycle.
    advanceClock(16); // one full cycle (budget 8 + break 8)
    vi.advanceTimersByTime(16);
    if (vi.getTimerCount() === before && vi.getTimerCount() > 0) {
      // no progress guard
      vi.runOnlyPendingTimers();
    }
  }
};

describe('createBudgetedQueue', () => {
  it('processes a small burst immediately (within the first budget window)', () => {
    const processed: number[] = [];
    // process is instant (clock does not advance), so everything fits in the 8ms budget.
    const queue = createBudgetedQueue<number>((n) => processed.push(n), 8);

    queue.push(1);
    queue.push(2);
    queue.push(3);

    expect(processed).toEqual([1, 2, 3]);
    expect(queue.size()).toBe(0);
    expect(vi.getTimerCount()).toBe(0); // no deferral needed
  });

  it('defers work that exceeds the budget, then resumes after the break', () => {
    const processed: number[] = [];
    // Each item costs 3ms of clock time. Budget is 8ms => ~2-3 items per window.
    const queue = createBudgetedQueue<number>((n) => {
      processed.push(n);
      advanceClock(3);
    }, 8);

    // Push 6 items in one go. Budget window is [0, 8): items at clock 0, 3, 6 are processed
    // (each check is before-processing), the 4th would be at clock 9 (>= 8) so it defers.
    for (let i = 1; i <= 6; i++) queue.push(i);

    // Some processed synchronously, remainder queued with a resume timer scheduled.
    expect(processed.length).toBeGreaterThan(0);
    expect(processed.length).toBeLessThan(6);
    expect(queue.size()).toBe(6 - processed.length);
    expect(vi.getTimerCount()).toBe(1); // exactly one pending resume

    // Drain the rest across resume cycles.
    flushTimers();

    expect(processed).toEqual([1, 2, 3, 4, 5, 6]); // FIFO order preserved
    expect(queue.size()).toBe(0);
  });

  it('preserves FIFO order across many cycles', () => {
    const processed: number[] = [];
    const queue = createBudgetedQueue<number>((n) => {
      processed.push(n);
      advanceClock(5); // >8/2, so ~1-2 per window -> many cycles
    }, 8);

    const input = Array.from({ length: 20 }, (_, i) => i);
    input.forEach((n) => queue.push(n));

    flushTimers();

    expect(processed).toEqual(input);
    expect(queue.size()).toBe(0);
  });

  it('schedules only one resume timer at a time', () => {
    const queue = createBudgetedQueue<number>(() => advanceClock(10), 8);

    // First push processes one (cost 10ms > 8ms budget) and defers the rest.
    queue.push(1);
    queue.push(2);
    queue.push(3);

    // Even with multiple pending items, there is at most one outstanding resume timer.
    expect(vi.getTimerCount()).toBe(1);
  });
});
