import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { mergeState } from '../src/mergeState';

describe('mergeState', () => {
  describe('primitive values', () => {
    it('should replace primitive number values', () => {
      expect(mergeState(1, 2)).toBe(2);
      expect(mergeState(42, 0)).toBe(0);
    });

    it('should replace primitive string values', () => {
      expect(mergeState('old', 'new')).toBe('new');
      expect(mergeState('test', '')).toBe('');
    });

    it('should replace primitive boolean values', () => {
      expect(mergeState(true, false)).toBe(false);
      expect(mergeState(false, true)).toBe(true);
    });

    it('should handle null and undefined', () => {
      expect(mergeState(null, 'value')).toBe('value');
      expect(mergeState('value', null)).toBe(null);
      expect(mergeState(undefined, 'value')).toBe('value');
      expect(mergeState('value', undefined)).toBe(undefined);
    });
  });

  describe('date objects', () => {
    it('should replace date objects', () => {
      const oldDate = new Date('2020-01-01');
      const newDate = new Date('2021-01-01');

      expect(mergeState(oldDate, newDate)).toBe(newDate);
    });

    it('should return new date when replacing non-date with date', () => {
      const date = new Date('2021-01-01');
      expect(mergeState({ a: 1 }, date)).toBe(date);
    });
  });

  describe('objects', () => {
    it('should merge simple object properties', () => {
      const state = { a: 1, b: 2 };
      const newState = { b: 3, c: 4 };
      const result = mergeState(state, newState);

      expect(result).toEqual({ b: 3, c: 4 });
    });

    it('should handle nested objects recursively', () => {
      const state = { user: { name: 'John', age: 30 } };
      const newState = { user: { age: 31 } };
      const result = mergeState(state, newState) as any;

      expect(result).toEqual({ user: { age: 31 } });
    });

    it('should handle deeply nested structures', () => {
      const state = {
        level1: {
          level2: {
            level3: {
              value: 'old',
              keep: true,
            },
          },
        },
      };
      const newState = {
        level1: {
          level2: {
            level3: {
              value: 'new',
            },
          },
        },
      };
      const result = mergeState(state, newState) as any;

      expect(result.level1.level2.level3.value).toBe('new');
    });

    it('should handle empty objects', () => {
      expect(mergeState({}, { a: 1 })).toEqual({ a: 1 });
      expect(mergeState({ a: 1 }, {})).toEqual({});
    });

    it('should create objects with null prototype', () => {
      const result = mergeState({ a: 1 }, { b: 2 }) as any;
      expect(Object.getPrototypeOf(result)).toBeNull();
    });
  });

  describe('arrays', () => {
    it('should replace arrays instead of merging', () => {
      const state = [1, 2, 3];
      const newState = [4, 5];

      expect(mergeState(state, newState)).toEqual([4, 5]);
      expect(mergeState(state, newState)).toBe(newState);
    });

    it('should replace object with array', () => {
      const state = { a: 1 };
      const newState = [1, 2, 3];

      expect(mergeState(state, newState)).toBe(newState);
    });

    it('should handle empty arrays', () => {
      expect(mergeState([1, 2], [])).toEqual([]);
    });
  });

  describe('special objects', () => {
    it('should replace Map objects', () => {
      const oldMap = new Map([['a', 1]]);
      const newMap = new Map([['b', 2]]);

      expect(mergeState(oldMap, newMap)).toBe(newMap);
    });

    it('should replace Set objects', () => {
      const oldSet = new Set([1, 2]);
      const newSet = new Set([3, 4]);

      expect(mergeState(oldSet, newSet)).toBe(newSet);
    });

    it('should replace object with Map', () => {
      const state = { a: 1 };
      const newMap = new Map([['b', 2]]);

      expect(mergeState(state, newMap)).toBe(newMap);
    });

    it('should replace object with Set', () => {
      const state = { a: 1 };
      const newSet = new Set([1, 2]);

      expect(mergeState(state, newSet)).toBe(newSet);
    });
  });

  describe('non-serializable values', () => {
    it('should preserve old values for non-serializable properties', () => {
      const oldFn = () => 'old function';
      const state = { fn: oldFn, value: 1 };
      const newState = { fn: { __non_serializable__: true } as any, value: 2 };
      const result = mergeState(state, newState) as any;

      expect(result.fn).toBe(oldFn);
      expect(result.value).toBe(2);
    });

    it('should throw when entire newState is non-serializable', () => {
      const state = { a: 1 };
      const newState = { __non_serializable__: true };

      expect(() => mergeState(state, newState)).toThrow();
    });

    it('should handle multiple non-serializable properties', () => {
      const fn1 = () => 'fn1';
      const fn2 = () => 'fn2';
      const state = { fn1, fn2, value: 1 };
      const newState = {
        fn1: { __non_serializable__: true } as any,
        fn2: { __non_serializable__: true } as any,
        value: 2,
      };
      const result = mergeState(state, newState) as any;

      expect(result.fn1).toBe(fn1);
      expect(result.fn2).toBe(fn2);
      expect(result.value).toBe(2);
    });

    it('should handle nested non-serializable values', () => {
      const fn = () => 'function';
      const state = { nested: { fn, value: 1 } };
      const newState = {
        nested: {
          fn: { __non_serializable__: true } as any,
          value: 2,
        },
      };
      const result = mergeState(state, newState) as any;

      expect(result.nested.fn).toBe(fn);
      expect(result.nested.value).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle replacing non-object state with object', () => {
      expect(mergeState('string', { a: 1 })).toEqual({ a: 1 });
      expect(mergeState(42, { a: 1 })).toEqual({ a: 1 });
      expect(mergeState(null, { a: 1 })).toEqual({ a: 1 });
    });

    it('should handle replacing object with primitive', () => {
      expect(mergeState({ a: 1 }, 'string')).toBe('string');
      expect(mergeState({ a: 1 }, 42)).toBe(42);
      expect(mergeState({ a: 1 }, null)).toBe(null);
    });

    it('should handle mixed property types', () => {
      const state = {
        num: 1,
        str: 'old',
        bool: true,
        obj: { nested: 'value' },
        arr: [1, 2],
      };
      const newState = {
        num: 2,
        str: 'new',
        bool: false,
        obj: { nested: 'updated' },
        arr: [3, 4, 5],
      };
      const result = mergeState(state, newState) as any;

      expect(result.num).toBe(2);
      expect(result.str).toBe('new');
      expect(result.bool).toBe(false);
      expect(result.obj.nested).toBe('updated');
      expect(result.arr).toEqual([3, 4, 5]);
    });

    it('should handle state with undefined values', () => {
      const state = { a: 1, b: undefined };
      const newState = { a: 2, b: 'defined' };
      const result = mergeState(state, newState);

      expect(result).toEqual({ a: 2, b: 'defined' });
    });

    it('should handle newState with only new keys', () => {
      const state = { a: 1 };
      const newState = { b: 2, c: 3 };
      const result = mergeState(state, newState);

      expect(result).toEqual({ b: 2, c: 3 });
    });
  });

  describe('real-world scenarios', () => {
    it('should merge form state correctly', () => {
      const state = {
        fields: {
          email: { value: 'old@example.com', touched: true, errors: [] },
          password: { value: 'oldpass', touched: false, errors: [] },
        },
        isSubmitting: false,
      };
      const newState = {
        fields: {
          email: { value: 'new@example.com', touched: true, errors: [] },
          password: { value: 'newpass', touched: true, errors: [] },
        },
        isSubmitting: true,
      };
      const result = mergeState(state, newState) as any;

      expect(result.fields.email.value).toBe('new@example.com');
      expect(result.fields.password.touched).toBe(true);
      expect(result.isSubmitting).toBe(true);
    });

    it('should merge shopping cart state correctly', () => {
      const state = {
        items: [
          { id: '1', quantity: 2, price: 10 },
          { id: '2', quantity: 1, price: 20 },
        ],
        total: 40,
      };
      const newState = {
        items: [{ id: '1', quantity: 3, price: 10 }],
        total: 30,
      };
      const result = mergeState(state, newState) as any;

      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(3);
      expect(result.total).toBe(30);
    });

    it('should handle user preferences with functions', () => {
      const customFormatter = (x: number) => x.toString();
      const state = {
        theme: 'dark',
        formatter: customFormatter,
        fontSize: 14,
      };
      const newState = {
        theme: 'light',
        formatter: { __non_serializable__: true } as any,
        fontSize: 16,
      };
      const result = mergeState(state, newState) as any;

      expect(result.theme).toBe('light');
      expect(result.formatter).toBe(customFormatter);
      expect(result.fontSize).toBe(16);
    });
  });
});
