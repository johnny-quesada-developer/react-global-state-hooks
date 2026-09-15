import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from '../debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic functionality', () => {
    it('should debounce function calls', () => {
      const callback = vi.fn();
      const debounced = debounce(callback, 100);

      debounced();
      debounced();
      debounced();

      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should call function with correct arguments', () => {
      const callback = vi.fn();
      const debounced = debounce(callback, 100);

      debounced('arg1', 'arg2', 123);

      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 123);
    });

    it('should use the latest arguments', () => {
      const callback = vi.fn();
      const debounced = debounce(callback, 100);

      debounced('first');
      vi.advanceTimersByTime(50);

      debounced('second');
      vi.advanceTimersByTime(50);

      debounced('third');
      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('third');
    });

    it('should work with default delay of 0', () => {
      const callback = vi.fn();
      const debounced = debounce(callback);

      debounced();

      vi.advanceTimersByTime(0);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('timing behavior', () => {
    it('should reset timeout on each call', () => {
      const callback = vi.fn();
      const debounced = debounce(callback, 100);

      debounced();
      vi.advanceTimersByTime(50);

      debounced();
      vi.advanceTimersByTime(50);

      // Callback should not have been called yet
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);

      // Now it should be called
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should allow multiple invocations after delay', () => {
      const callback = vi.fn();
      const debounced = debounce(callback, 100);

      // First batch
      debounced();
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);

      // Second batch
      debounced();
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(2);

      // Third batch
      debounced();
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid calls correctly', () => {
      const callback = vi.fn();
      const debounced = debounce(callback, 100);

      // Rapid calls within 100ms
      for (let i = 0; i < 10; i++) {
        debounced(`call-${i}`);
        vi.advanceTimersByTime(10);
      }

      // Should not have been called yet
      expect(callback).not.toHaveBeenCalled();

      // Wait for the full delay
      vi.advanceTimersByTime(100);

      // Should be called once with last arguments
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('call-9');
    });
  });

  describe('with different delays', () => {
    it('should respect short delays', () => {
      const callback = vi.fn();
      const debounced = debounce(callback, 10);

      debounced();
      vi.advanceTimersByTime(10);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should respect long delays', () => {
      const callback = vi.fn();
      const debounced = debounce(callback, 1000);

      debounced();
      vi.advanceTimersByTime(999);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle zero delay', () => {
      const callback = vi.fn();
      const debounced = debounce(callback, 0);

      debounced();
      vi.advanceTimersByTime(0);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('argument handling', () => {
    it('should handle no arguments', () => {
      const callback = vi.fn();
      const debounced = debounce(callback, 100);

      debounced();
      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledWith();
    });

    it('should handle multiple arguments of different types', () => {
      const callback = vi.fn();
      const debounced = debounce(callback, 100);

      debounced('string', 123, true, null, { key: 'value' });
      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledWith('string', 123, true, null, { key: 'value' });
    });

    it('should handle objects and arrays', () => {
      const callback = vi.fn();
      const debounced = debounce(callback, 100);

      const obj = { a: 1, b: 2 };
      const arr = [1, 2, 3];

      debounced(obj, arr);
      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledWith(obj, arr);
    });

    it('should preserve function references in arguments', () => {
      const callback = vi.fn();
      const debounced = debounce(callback, 100);
      const func = () => 'test';

      debounced(func);
      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledWith(func);
    });
  });

  describe('real-world scenarios', () => {
    it('should debounce search input', () => {
      const searchCallback = vi.fn();
      const debouncedSearch = debounce(searchCallback, 300);

      // User types "test"
      debouncedSearch('t');
      vi.advanceTimersByTime(50);
      debouncedSearch('te');
      vi.advanceTimersByTime(50);
      debouncedSearch('tes');
      vi.advanceTimersByTime(50);
      debouncedSearch('test');

      // Search should not have been triggered yet
      expect(searchCallback).not.toHaveBeenCalled();

      // Wait for debounce delay
      vi.advanceTimersByTime(300);

      // Search should be triggered once with final value
      expect(searchCallback).toHaveBeenCalledTimes(1);
      expect(searchCallback).toHaveBeenCalledWith('test');
    });

    it('should debounce window resize handler', () => {
      const resizeCallback = vi.fn();
      const debouncedResize = debounce(resizeCallback, 200);

      // Simulate rapid resize events
      for (let i = 0; i < 20; i++) {
        debouncedResize({ width: 800 + i, height: 600 });
        vi.advanceTimersByTime(10);
      }

      // Callback should not have been called yet
      expect(resizeCallback).not.toHaveBeenCalled();

      // Wait for debounce delay
      vi.advanceTimersByTime(200);

      // Callback should be called once
      expect(resizeCallback).toHaveBeenCalledTimes(1);
    });

    it('should debounce auto-save functionality', () => {
      const saveCallback = vi.fn();
      const debouncedSave = debounce(saveCallback, 1000);

      // User makes changes
      debouncedSave({ content: 'change 1' });
      vi.advanceTimersByTime(500);

      debouncedSave({ content: 'change 2' });
      vi.advanceTimersByTime(500);

      debouncedSave({ content: 'change 3' });

      // Save should not have been triggered yet
      expect(saveCallback).not.toHaveBeenCalled();

      // Wait for debounce delay
      vi.advanceTimersByTime(1000);

      // Save should be triggered once with final content
      expect(saveCallback).toHaveBeenCalledTimes(1);
      expect(saveCallback).toHaveBeenCalledWith({ content: 'change 3' });
    });

    it('should debounce form validation', () => {
      const validateCallback = vi.fn();
      const debouncedValidate = debounce(validateCallback, 500);

      // User types in form field
      debouncedValidate('test@');
      vi.advanceTimersByTime(100);

      debouncedValidate('test@example');
      vi.advanceTimersByTime(100);

      debouncedValidate('test@example.com');

      // Validation should not have run yet
      expect(validateCallback).not.toHaveBeenCalled();

      // Wait for debounce delay
      vi.advanceTimersByTime(500);

      // Validation should run once
      expect(validateCallback).toHaveBeenCalledTimes(1);
      expect(validateCallback).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('memory and cleanup', () => {
    it('should clear previous timeout', () => {
      const callback = vi.fn();
      const debounced = debounce(callback, 100);

      debounced();
      const timeoutCount = vi.getTimerCount();

      debounced();

      // Should not create additional timers
      expect(vi.getTimerCount()).toBe(timeoutCount);
    });

    it('should handle multiple debounced functions independently', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const debounced1 = debounce(callback1, 100);
      const debounced2 = debounce(callback2, 200);

      debounced1();
      debounced2();

      vi.advanceTimersByTime(100);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle callback that throws error', () => {
      const callback = vi.fn(() => {
        throw new Error('Test error');
      });
      const debounced = debounce(callback, 100);

      debounced();

      expect(() => {
        vi.advanceTimersByTime(100);
      }).toThrow('Test error');
    });

    it('should work when called immediately after previous execution', () => {
      const callback = vi.fn();
      const debounced = debounce(callback, 100);

      debounced();
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);

      debounced();
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should handle very small delays', () => {
      const callback = vi.fn();
      const debounced = debounce(callback, 1);

      debounced();
      vi.advanceTimersByTime(1);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
