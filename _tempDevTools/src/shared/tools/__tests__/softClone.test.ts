import { describe, it, expect } from 'vitest';
import { softClone } from '../softClone';

describe('softClone', () => {
  it('should clone primitive values', () => {
    expect(softClone(42)).toBe(42);
    expect(softClone('string')).toBe('string');
    expect(softClone(true)).toBe(true);
    expect(softClone(null)).toBe(null);
    expect(softClone(undefined)).toBe(undefined);
  });

  it('should clone arrays', () => {
    const original = [1, 2, 3];
    const cloned = softClone(original);

    expect(cloned).toEqual([1, 2, 3]);
    expect(cloned).not.toBe(original);
  });

  it('should clone objects', () => {
    const original = { a: 1, b: 'test', c: true };
    const cloned = softClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
  });

  it('should handle nested structures', () => {
    const original = {
      items: [1, 2, { nested: 'value' }],
      metadata: {
        count: 3,
        active: true,
      },
    };
    const cloned = softClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.items).not.toBe(original.items);
    expect(cloned.metadata).not.toBe(original.metadata);
  });

  it('should preserve Date objects', () => {
    const date = new Date('2026-04-18');
    const cloned = softClone(date);

    expect(cloned).toEqual(date);
  });

  it('should handle empty arrays and objects', () => {
    expect(softClone([])).toEqual([]);
    expect(softClone({})).toEqual({});
  });
});
