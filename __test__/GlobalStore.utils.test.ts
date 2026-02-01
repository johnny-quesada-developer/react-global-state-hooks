import { shallowCompare } from '..';
// import { shallowCompare } from '../src';

describe('shallowCompare', () => {
  it('should return true if the objects are the same reference', () => {
    const object = { a: 1, b: 2 };

    expect(shallowCompare(object, object)).toBe(true);
  });

  it('should return false if the objects are different', () => {
    const object = { a: 1, b: 2 };

    expect(shallowCompare(object, { ...object })).toBe(true);
  });

  it('should return false if the objects are different', () => {
    const object = { a: 1, b: 2 };

    expect(shallowCompare(object, { ...object, c: 3 } as unknown)).toBe(false);
  });

  it('should return false if the objects are different', () => {
    const object = { a: 1, b: 2 };

    expect(shallowCompare(object, { ...object, a: 3 })).toBe(false);
  });

  it('should return false if the objects are different', () => {
    const object = { a: 1, b: 2 };

    expect(shallowCompare(object, { ...object, a: 3, b: 4 })).toBe(false);
  });

  it('should handle null and undefined', () => {
    expect(shallowCompare(null, null)).toBe(true);
    expect(shallowCompare(undefined, undefined)).toBe(true);
    expect(shallowCompare(null, undefined)).toBe(false);
    expect(shallowCompare(undefined, null)).toBe(false);

    expect(shallowCompare(null, {})).toBe(false);
    expect(shallowCompare(undefined, {})).toBe(false);
    expect(shallowCompare({ a: null }, { a: null })).toBe(true);
  });

  it('should compare Map objects', () => {
    const map1 = new Map([
      ['a', 1],
      ['b', 2],
    ]);
    const map2 = new Map([
      ['a', 1],
      ['b', 2],
    ]);
    const map3 = new Map([
      ['a', 1],
      ['b', 3],
    ]);
    const map4 = new Map([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);

    expect(shallowCompare(map1, map1)).toBe(true);
    expect(shallowCompare(map1, map2)).toBe(true);
    expect(shallowCompare(map1, map3)).toBe(false);
    expect(shallowCompare(map1, map4)).toBe(false);
  });

  it('should compare Set objects', () => {
    const set1 = new Set([1, 2, 3]);
    const set2 = new Set([1, 2, 3]);
    const set3 = new Set([1, 2, 4]);
    const set4 = new Set([1, 2]);

    expect(shallowCompare(set1, set1)).toBe(true);
    expect(shallowCompare(set1, set2)).toBe(true);
    expect(shallowCompare(set1, set3)).toBe(false);
    expect(shallowCompare(set1, set4)).toBe(false);
  });

  it('should compare Date objects', () => {
    const date1 = new Date('2024-01-01');
    const date2 = new Date('2024-01-01');
    const date3 = new Date('2024-01-02');

    expect(shallowCompare(date1, date1)).toBe(true);
    // Different Date instances with same value are considered equal
    expect(shallowCompare(date1, date2)).toBe(false); // Different object instances
    expect(shallowCompare(date1, date3)).toBe(false);
  });

  it('should compare primitives', () => {
    expect(shallowCompare('hello', 'hello')).toBe(true);
    expect(shallowCompare('hello', 'world')).toBe(false);
    expect(shallowCompare(42, 42)).toBe(true);
    expect(shallowCompare(42, 43)).toBe(false);
    expect(shallowCompare(true, true)).toBe(true);
    expect(shallowCompare(true, false)).toBe(false);
  });

  it('should handle edge cases like NaN, Infinity, -0 vs +0', () => {
    expect(shallowCompare(NaN, NaN)).toBe(false); // NaN !== NaN
    expect(shallowCompare(Infinity, Infinity)).toBe(true);
    expect(shallowCompare(-Infinity, -Infinity)).toBe(true);
    expect(shallowCompare(Infinity, -Infinity)).toBe(false);
    expect(shallowCompare(0, -0)).toBe(true); // 0 === -0 in JavaScript
    expect(shallowCompare(-0, 0)).toBe(true);
  });

  it('should compare functions', () => {
    const fn1 = () => {};
    const fn2 = () => {};

    expect(shallowCompare(fn1, fn1)).toBe(true);
    expect(shallowCompare(fn1, fn2)).toBe(false);
  });

  it('should compare nested arrays with objects', () => {
    const arr1 = [1, 2, { a: 1 }];
    const arr2 = [1, 2, { a: 1 }];
    const obj1 = { a: 1 };
    const arr3 = [1, 2, obj1];
    const arr4 = [1, 2, obj1];

    // Different object references
    expect(shallowCompare(arr1, arr2)).toBe(false);
    // Same object reference
    expect(shallowCompare(arr3, arr4)).toBe(true);
  });

  it('should handle different types comparison', () => {
    expect(shallowCompare(1 as unknown, '1' as unknown)).toBe(false);
    expect(shallowCompare(true as unknown, 1 as unknown)).toBe(false);
    // {} and [] are different types (object vs array)
    expect(shallowCompare({}, [])).toBe(false);
    expect(shallowCompare(null, 0)).toBe(false);
    expect(shallowCompare(undefined, 0)).toBe(false);
  });

  it('should compare empty collections', () => {
    expect(shallowCompare([], [])).toBe(true);
    expect(shallowCompare({}, {})).toBe(true);
    expect(shallowCompare(new Map(), new Map())).toBe(true);
    expect(shallowCompare(new Set(), new Set())).toBe(true);
  });
});
