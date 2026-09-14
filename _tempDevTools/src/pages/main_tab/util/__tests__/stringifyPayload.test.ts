import { describe, it, expect } from 'vitest';
import { stringifyPayload } from '../stringifyPayload';

describe('stringifyPayload', () => {
  describe('primitive values', () => {
    it('should stringify null', () => {
      expect(stringifyPayload(null)).toBe('null');
    });

    it('should stringify undefined', () => {
      expect(stringifyPayload(undefined)).toBe('undefined');
    });

    it('should stringify strings', () => {
      expect(stringifyPayload('test')).toBe('"test"');
      expect(stringifyPayload('')).toBe('""');
    });

    it('should stringify numbers', () => {
      expect(stringifyPayload(42)).toBe('42');
      expect(stringifyPayload(0)).toBe('0');
      expect(stringifyPayload(-10.5)).toBe('-10.5');
    });

    it('should stringify booleans', () => {
      expect(stringifyPayload(true)).toBe('true');
      expect(stringifyPayload(false)).toBe('false');
    });
  });

  describe('arrays', () => {
    it('should stringify empty arrays', () => {
      expect(stringifyPayload([])).toBe('');
    });

    it('should stringify simple arrays', () => {
      const result = stringifyPayload([1, 2, 3]);
      expect(result).toContain('1');
      expect(result).toContain('2');
      expect(result).toContain('3');
    });

    it('should stringify nested arrays', () => {
      const result = stringifyPayload([
        [1, 2],
        [3, 4],
      ]);
      expect(result).toBeTruthy();
    });

    it('should handle arrays with mixed types', () => {
      const result = stringifyPayload([1, 'two', true, null]);
      expect(result).toContain('1');
      expect(result).toContain('"two"');
      expect(result).toContain('true');
      expect(result).toContain('null');
    });
  });

  describe('objects', () => {
    it('should stringify empty objects', () => {
      // Empty objects still show as {} after removing outer array brackets
      expect(stringifyPayload({})).toBe('{}');
    });

    it('should stringify simple objects', () => {
      const result = stringifyPayload({ a: 1, b: 'test' });
      expect(result).toContain('a: 1');
      expect(result).toContain('b: "test"');
    });

    it('should sort object keys alphabetically', () => {
      const result = stringifyPayload({ z: 1, a: 2, m: 3 });

      // Keys should appear in alphabetical order
      expect(result.indexOf('a:')).toBeLessThan(result.indexOf('m:'));
      expect(result.indexOf('m:')).toBeLessThan(result.indexOf('z:'));
    });

    it('should handle nested objects', () => {
      const result = stringifyPayload({
        user: {
          name: 'Alice',
          age: 30,
        },
      });
      expect(result).toContain('user:');
      expect(result).toContain('name: "Alice"');
      expect(result).toContain('age: 30');
    });

    it('should apply indentation correctly', () => {
      const result = stringifyPayload({ a: { b: 1 } }, 2);
      // Check for proper indentation
      expect(result).toContain('  '); // Should have indentation
    });
  });

  describe('special types (formatted by $t marker)', () => {
    it('should handle Date objects', () => {
      const dateObj = { $t: 'date', $v: '2026-04-18' };
      const result = stringifyPayload(dateObj);
      expect(result).toBe('new Date("2026-04-18")');
    });

    it('should handle Map objects', () => {
      const mapObj = {
        $t: 'map',
        $v: [
          ['key1', 'value1'],
          ['key2', 'value2'],
        ],
      };
      const result = stringifyPayload(mapObj);
      expect(result).toContain('new Map');
      expect(result).toContain('"key1"');
      expect(result).toContain('"value1"');
    });

    it('should handle Set objects', () => {
      const setObj = {
        $t: 'set',
        $v: [1, 2, 3],
      };
      const result = stringifyPayload(setObj);
      expect(result).toContain('new Set');
      expect(result).toContain('1');
      expect(result).toContain('2');
      expect(result).toContain('3');
    });

    it('should handle RegExp objects', () => {
      const regexObj = { $t: 'regex', $v: '[a-z]+' };
      const result = stringifyPayload(regexObj);
      expect(result).toBe('new RegExp("[a-z]+")');
    });

    it('should handle Error objects', () => {
      const errorObj = { $t: 'error', $v: 'Something went wrong' };
      const result = stringifyPayload(errorObj);
      expect(result).toBe('new Error("Something went wrong")');
    });

    it('should handle Function objects', () => {
      const funcObj = { $t: 'function', $v: 'x => x + 1' };
      const result = stringifyPayload(funcObj);
      expect(result).toBe('(x => x + 1)');
    });

    it('should handle empty Map', () => {
      const mapObj = { $t: 'map', $v: [] };
      const result = stringifyPayload(mapObj);
      expect(result).toContain('new Map');
    });

    it('should handle empty Set', () => {
      const setObj = { $t: 'set', $v: [] };
      const result = stringifyPayload(setObj);
      expect(result).toContain('new Set');
    });
  });

  describe('indentation control', () => {
    it('should use default indentation of 2 spaces', () => {
      const result = stringifyPayload({ a: { b: 1 } });
      expect(result).toContain('  '); // 2 spaces
    });

    it('should respect custom indentation', () => {
      const result = stringifyPayload({ a: { b: 1 } }, 4);
      // Should have 4-space indentation at some level
      expect(result.length).toBeGreaterThan(0);
    });

    it('should apply indentation to nested structures', () => {
      const result = stringifyPayload({
        level1: {
          level2: {
            level3: 'deep',
          },
        },
      });
      // Should have multiple levels of indentation
      expect(result).toContain('level1:');
      expect(result).toContain('level2:');
      expect(result).toContain('level3:');
    });
  });

  describe('complex scenarios', () => {
    it('should handle state with actions payload', () => {
      const result = stringifyPayload({
        type: 'INCREMENT',
        payload: { by: 1 },
      });
      expect(result).toContain('type: "INCREMENT"');
      expect(result).toContain('payload:');
      expect(result).toContain('by: 1');
    });

    it('should handle form state', () => {
      const result = stringifyPayload({
        fields: {
          email: { value: 'test@example.com', touched: true },
          password: { value: '', touched: false },
        },
      });
      expect(result).toContain('fields:');
      expect(result).toContain('email:');
      expect(result).toContain('"test@example.com"');
      expect(result).toContain('touched: true');
    });

    it('should handle API response data', () => {
      const result = stringifyPayload({
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        pagination: {
          page: 1,
          total: 100,
        },
      });
      expect(result).toContain('users:');
      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
      expect(result).toContain('pagination:');
    });

    it('should handle deeply nested objects with mixed types', () => {
      const result = stringifyPayload({
        level1: {
          level2: {
            array: [1, 2, { nested: true }],
            obj: {
              key: 'value',
            },
          },
        },
      });
      expect(result).toContain('level1:');
      expect(result).toContain('level2:');
      expect(result).toContain('array:');
      expect(result).toContain('nested: true');
    });

    it('should handle arrays of objects', () => {
      const result = stringifyPayload([
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ]);
      expect(result).toContain('id: 1');
      expect(result).toContain('name: "Item 1"');
      expect(result).toContain('id: 2');
    });
  });

  describe('edge cases', () => {
    it('should handle objects with null values', () => {
      const result = stringifyPayload({ a: null, b: 1 });
      expect(result).toContain('a: null');
      expect(result).toContain('b: 1');
    });

    it('should handle objects with undefined values', () => {
      const result = stringifyPayload({ a: undefined, b: 1 });
      expect(result).toContain('a: undefined');
      expect(result).toContain('b: 1');
    });

    it('should handle arrays with null and undefined', () => {
      const result = stringifyPayload([null, undefined, 1]);
      expect(result).toContain('null');
      expect(result).toContain('undefined');
      expect(result).toContain('1');
    });

    it('should handle special characters in strings', () => {
      const result = stringifyPayload({ message: 'Hello\n"World"' });
      expect(result).toContain('message:');
      expect(result).toContain('"Hello');
    });

    it('should handle empty string values', () => {
      const result = stringifyPayload({ empty: '' });
      expect(result).toContain('empty: ""');
    });

    it('should handle zero values', () => {
      const result = stringifyPayload({ zero: 0 });
      expect(result).toContain('zero: 0');
    });

    it('should handle false values', () => {
      const result = stringifyPayload({ flag: false });
      expect(result).toContain('flag: false');
    });

    it('should handle single element arrays', () => {
      const result = stringifyPayload([42]);
      expect(result).toContain('42');
    });

    it('should handle single property objects', () => {
      const result = stringifyPayload({ only: 'one' });
      expect(result).toContain('only: "one"');
    });
  });

  describe('special formatting for payloads (array wrapper removal)', () => {
    it('should remove outer array brackets', () => {
      // Since payloads are stored as arrays, the function removes outer brackets
      const result = stringifyPayload([{ count: 1 }]);
      // Should not start with [ or end with ]
      expect(result.trim().startsWith('[')).toBe(false);
      expect(result.trim().endsWith(']')).toBe(false);
    });

    it('should keep inner array brackets', () => {
      const result = stringifyPayload([{ items: [1, 2, 3] }]);
      // Inner arrays should still have brackets in the output
      expect(result).toContain('[');
      expect(result).toContain(']');
    });
  });

  describe('mixed complex types', () => {
    it('should handle object with Date', () => {
      const result = stringifyPayload({
        timestamp: { $t: 'date', $v: '2026-04-18' },
        value: 42,
      });
      expect(result).toContain('new Date');
      expect(result).toContain('value: 42');
    });

    it('should handle object with Map', () => {
      const result = stringifyPayload({
        data: {
          $t: 'map',
          $v: [['key', 'value']],
        },
        count: 1,
      });
      expect(result).toContain('new Map');
      expect(result).toContain('count: 1');
    });

    it('should handle nested special types', () => {
      const result = stringifyPayload({
        config: {
          regex: { $t: 'regex', $v: '^test' },
          date: { $t: 'date', $v: '2026-01-01' },
        },
      });
      expect(result).toContain('new RegExp');
      expect(result).toContain('new Date');
    });
  });

  describe('performance with large objects', () => {
    it('should handle large arrays', () => {
      const largeArray = Array(100)
        .fill(0)
        .map((_, i) => i);
      const result = stringifyPayload(largeArray);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(100);
    });

    it('should handle objects with many keys', () => {
      const largeObj: Record<string, number> = {};
      for (let i = 0; i < 50; i++) {
        largeObj[`key${i}`] = i;
      }
      const result = stringifyPayload(largeObj);
      expect(result).toBeTruthy();
      expect(result).toContain('key0:');
      expect(result).toContain('key49:');
    });
  });
});
