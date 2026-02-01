import { isRecord } from '..';
// import { isRecord } from '../src';

describe('isRecord', () => {
  it('should return true for plain objects', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord({ a: 1, b: 2, c: 3 })).toBe(true);
  });

  it('should return true for objects created with Object.create', () => {
    expect(isRecord(Object.create(null))).toBe(true);
    expect(isRecord(Object.create({}))).toBe(true);
  });

  it('should return false for arrays', () => {
    expect(isRecord([])).toBe(false);
    expect(isRecord([1, 2, 3])).toBe(false);
  });

  it('should return true for class instances', () => {
    class TestClass {
      prop = 'value';
    }
    expect(isRecord(new TestClass())).toBe(true);
  });

  it('should return false for Date objects', () => {
    expect(isRecord(new Date())).toBe(false);
  });

  it('should return false for Map and Set', () => {
    expect(isRecord(new Map())).toBe(false);
    expect(isRecord(new Set())).toBe(false);
  });

  it('should return false for null', () => {
    expect(isRecord(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isRecord(undefined)).toBe(false);
  });

  it('should return false for primitives', () => {
    expect(isRecord('string')).toBe(false);
    expect(isRecord(123)).toBe(false);
    expect(isRecord(true)).toBe(false);
    expect(isRecord(false)).toBe(false);
    expect(isRecord(Symbol('test'))).toBe(false);
    expect(isRecord(BigInt(123))).toBe(false);
  });

  it('should return false for functions', () => {
    expect(isRecord(() => {})).toBe(false);
    expect(isRecord(function () {})).toBe(false);
    expect(isRecord(async () => {})).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(isRecord(NaN)).toBe(false);
    expect(isRecord(Infinity)).toBe(false);
    expect(isRecord(-Infinity)).toBe(false);
  });
});
