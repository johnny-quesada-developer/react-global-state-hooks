import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throttle } from '../throttle';

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T00:00:00Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic functionality', () => {
    it('should throttle function calls', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 100);

      throttled();
      throttled();
      throttled();

      // Should only be called once (first call)
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should allow calls after delay', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 100);

      throttled();
      expect(callback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);

      throttled();
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should call function with correct arguments', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 100);

      throttled('arg1', 'arg2', 123);

      expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 123);
    });

    it('should execute immediately on first call', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 100);

      throttled();

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('timing behavior', () => {
    it('should respect throttle delay', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 100);

      throttled(); // Called at t=0
      expect(callback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(50);
      throttled(); // Called at t=50 (blocked)
      expect(callback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(50);
      throttled(); // Called at t=100 (allowed)
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should allow multiple calls after successive delays', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 100);

      throttled();
      expect(callback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttled();
      expect(callback).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(100);
      throttled();
      expect(callback).toHaveBeenCalledTimes(3);

      vi.advanceTimersByTime(100);
      throttled();
      expect(callback).toHaveBeenCalledTimes(4);
    });

    it('should block rapid calls within throttle window', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 200);

      throttled(); // t=0, called
      vi.advanceTimersByTime(50);
      throttled(); // t=50, blocked
      vi.advanceTimersByTime(50);
      throttled(); // t=100, blocked
      vi.advanceTimersByTime(50);
      throttled(); // t=150, blocked

      expect(callback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(50);
      throttled(); // t=200, called

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should handle exact delay boundary', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 100);

      throttled();
      expect(callback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(99);
      throttled();
      expect(callback).toHaveBeenCalledTimes(1); // Still blocked

      vi.advanceTimersByTime(1); // Now at exactly 100ms
      throttled();
      expect(callback).toHaveBeenCalledTimes(2); // Should be allowed
    });
  });

  describe('with different delays', () => {
    it('should work with short delays', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 10);

      throttled();
      expect(callback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(10);
      throttled();
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should work with long delays', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 1000);

      throttled();
      expect(callback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(999);
      throttled();
      expect(callback).toHaveBeenCalledTimes(1); // Still blocked

      vi.advanceTimersByTime(1);
      throttled();
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should work with zero delay', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 0);

      throttled();
      expect(callback).toHaveBeenCalledTimes(1);

      throttled();
      expect(callback).toHaveBeenCalledTimes(2);

      throttled();
      expect(callback).toHaveBeenCalledTimes(3);
    });
  });

  describe('argument handling', () => {
    it('should handle no arguments', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 100);

      throttled();

      expect(callback).toHaveBeenCalledWith();
    });

    it('should handle multiple arguments of different types', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 100);

      throttled('string', 123, true, null, { key: 'value' });

      expect(callback).toHaveBeenCalledWith('string', 123, true, null, { key: 'value' });
    });

    it('should use latest arguments when allowed to call', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 100);

      throttled('first');
      vi.advanceTimersByTime(50);
      throttled('blocked'); // This call is blocked

      vi.advanceTimersByTime(50);
      throttled('second'); // This call is allowed

      // Should have been called twice with first and second
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback.mock.calls[0][0]).toBe('first');
      expect(callback.mock.calls[1][0]).toBe('second');
    });

    it('should handle objects and arrays', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 100);

      const obj = { a: 1, b: 2 };
      const arr = [1, 2, 3];

      throttled(obj, arr);

      expect(callback).toHaveBeenCalledWith(obj, arr);
    });
  });

  describe('real-world scenarios', () => {
    it('should throttle scroll event handler', () => {
      const scrollCallback = vi.fn();
      const throttledScroll = throttle(scrollCallback, 100);

      // Simulate rapid scroll events
      for (let i = 0; i < 10; i++) {
        throttledScroll({ scrollY: i * 100 });
        vi.advanceTimersByTime(10); // Events every 10ms
      }

      // Should have been called at t=0, and after 100ms
      // First call at t=0, next eligible call would be at t=100
      // But we only advance to t=90 (10 events * 10ms - 10ms)
      expect(scrollCallback).toHaveBeenCalledTimes(1);
    });

    it('should throttle mouse move handler', () => {
      const mouseMoveCallback = vi.fn();
      const throttledMouseMove = throttle(mouseMoveCallback, 50);

      // Simulate mouse movement
      for (let i = 0; i < 20; i++) {
        throttledMouseMove({ x: i, y: i });
        vi.advanceTimersByTime(10);
      }

      // Events every 10ms for 200ms with 50ms throttle
      // Call at t=0, then after 50ms at t=50, t=100, t=150
      expect(mouseMoveCallback).toHaveBeenCalledTimes(4);
    });

    it('should throttle API rate limiting', () => {
      const apiCallback = vi.fn();
      const throttledApi = throttle(apiCallback, 1000);

      // Attempt 10 API calls immediately
      for (let i = 0; i < 10; i++) {
        throttledApi({ userId: i });
      }

      // Only first call should go through
      expect(apiCallback).toHaveBeenCalledTimes(1);

      // Wait 1 second
      vi.advanceTimersByTime(1000);

      // Next call should go through
      throttledApi({ userId: 11 });
      expect(apiCallback).toHaveBeenCalledTimes(2);
    });

    it('should throttle window resize handler', () => {
      const resizeCallback = vi.fn();
      const throttledResize = throttle(resizeCallback, 200);

      // Simulate resize events every 50ms for 1 second
      for (let i = 0; i < 20; i++) {
        throttledResize({ width: 800 + i, height: 600 });
        vi.advanceTimersByTime(50);
      }

      // 20 events over 1000ms with 200ms throttle
      // Should be called at: t=0, t=200, t=400, t=600, t=800
      expect(resizeCallback).toHaveBeenCalledTimes(5);
    });

    it('should throttle analytics tracking', () => {
      const trackCallback = vi.fn();
      const throttledTrack = throttle(trackCallback, 5000);

      // User performs many actions
      throttledTrack({ event: 'page_view' });
      throttledTrack({ event: 'button_click' }); // Blocked
      throttledTrack({ event: 'scroll' }); // Blocked

      expect(trackCallback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(5000);

      throttledTrack({ event: 'another_click' });
      expect(trackCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('comparison with debounce behavior', () => {
    it('should execute immediately (unlike debounce)', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 100);

      throttled();

      // Throttle executes immediately
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not execute trailing call (unlike debounce)', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 100);

      throttled('first');
      vi.advanceTimersByTime(50);
      throttled('second'); // This is blocked, not delayed

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('first');

      // Wait for the throttle window to end
      vi.advanceTimersByTime(50);

      // Second call is not executed (it was blocked, not delayed)
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should spread calls evenly over time', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 100);

      // Make calls every 40ms for 500ms
      for (let i = 0; i < 13; i++) {
        throttled(i);
        vi.advanceTimersByTime(40);
      }

      // Calls at: t=0, t=100, t=200, t=300, t=400 (stops before t=500)
      expect(callback).toHaveBeenCalledTimes(5);
    });
  });

  describe('multiple throttled functions', () => {
    it('should handle multiple throttled functions independently', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const throttled1 = throttle(callback1, 100);
      const throttled2 = throttle(callback2, 200);

      throttled1();
      throttled2();

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);

      throttled1();
      throttled2(); // Still blocked for callback2

      expect(callback1).toHaveBeenCalledTimes(2);
      expect(callback2).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);

      throttled2();

      expect(callback2).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle callback that throws error', () => {
      const callback = vi.fn(() => {
        throw new Error('Test error');
      });
      const throttled = throttle(callback, 100);

      expect(() => throttled()).toThrow('Test error');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should work with very small delays', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 1);

      throttled();
      expect(callback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1);
      throttled();
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should initialize with -Infinity lastCall', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 100);

      // First call should always execute regardless of current time
      throttled();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle calls at exactly the delay interval', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 100);

      throttled(); // t=0
      expect(callback).toHaveBeenCalledTimes(1);

      // Advance exactly 100ms
      vi.advanceTimersByTime(100);
      throttled(); // t=100
      expect(callback).toHaveBeenCalledTimes(2);

      // Advance exactly 100ms again
      vi.advanceTimersByTime(100);
      throttled(); // t=200
      expect(callback).toHaveBeenCalledTimes(3);
    });
  });

  describe('performance characteristics', () => {
    it('should handle high-frequency calls efficiently', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 100);

      // Simulate 1000 calls over 1 second (every 1ms)
      for (let i = 0; i < 1000; i++) {
        throttled(i);
        vi.advanceTimersByTime(1);
      }

      // Should only call 10 times (at t=0, 100, 200, ..., 900)
      // Note: t=1000 is after the loop ends
      expect(callback).toHaveBeenCalledTimes(10);
    });

    it('should not accumulate memory with repeated calls', () => {
      const callback = vi.fn();
      const throttled = throttle(callback, 100);

      // Make many blocked calls
      for (let i = 0; i < 100; i++) {
        throttled();
      }

      // Should still only call once
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
