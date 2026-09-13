import isPrimitive from 'json-storage-formatter/isPrimitive';
import isDate from 'json-storage-formatter/isDate';
import isNil from 'json-storage-formatter/isNil';
import isRecord from './isRecord';

/**
 * @description It performs a shallow comparison of the values.
 * @param value1 - The first value to compare.
 * @param value2 - The second value to compare.
 * @returns True if the values are equal, false otherwise.
 */
export const shallowCompare = <T>(value1: T, value2: T) => {
  const isEqual = value1 === value2;
  if (isEqual) return true;

  if (canCheckSimpleEquality(value1, value2)) {
    return value1 === value2;
  }

  if (isArray(value1) && isArray(value2)) {
    return isEqualArray(value1, value2);
  }

  if (isMap(value1) && isMap(value2)) {
    return isEqualMap(value1, value2);
  }

  if (isSet(value1) && isSet(value2)) {
    return isEqualSet(value1, value2);
  }

  if (!isRecord(value1) || !isRecord(value2)) return value1 === value2;

  return isEqualObject(value1, value2);
};

export const isArray = (value: unknown): value is unknown[] => Array.isArray(value);

export const isMap = (value: unknown): value is Map<unknown, unknown> => {
  return value instanceof Map;
};

export const isSet = (value: unknown): value is Set<unknown> => {
  return value instanceof Set;
};

/**
 * @description Determines whether a simple equality check (using `===`) is sufficient
 * to compare the provided values. This helps decide when a deep equality check
 * is unnecessary or inefficient.
 *
 * Simple equality checks are considered valid when:
 * - The values have different types (comparison will trivially return false)
 * - Either value is null or undefined
 * - Both values are primitive types (string, number, boolean, symbol, bigint)
 * - Both values are Date objects
 * - Both values are functions
 *
 * @param value1 - The first value to compare.
 * @param value2 - The second value to compare.
 * @returns `true` if a simple `===` check is sufficient, `false` if a deep comparison may be required.
 *
 * @example
 * ```ts
 * canCheckSimpleEquality(42, 42); // true (primitive numbers)
 * canCheckSimpleEquality({ a: 1 }, { a: 1 }); // false (objects)
 * canCheckSimpleEquality([1, 2], [1, 2]); // false (arrays)
 * canCheckSimpleEquality('a', 1); // true (different types, shallow check enough)
 * ```
 */
export const canCheckSimpleEquality = (value1: unknown, value2: unknown): boolean => {
  const typeofValue1 = typeof value1;
  const typeofValue2 = typeof value2;

  // simple equality check will trigger false if types are different
  if (typeofValue1 !== typeofValue2) return true;

  return (
    isNil(value1) ||
    isNil(value2) ||
    (isPrimitive(value1) && isPrimitive(value2)) ||
    (isDate(value1) && isDate(value2)) ||
    (typeofValue1 === 'function' && typeofValue2 === 'function')
  );
};

/**
 * @description Performs a shallow comparison between two arrays.
 */
export const isEqualArray = <T>(array1: T[], array2: T[]): array1 is T[] => {
  if (array1.length !== array2.length) return false;

  for (let i = 0; i < array1.length; i += 1) {
    const $value1 = array1[i];
    const $value2 = array2[i];

    if ($value1 !== $value2) return false;
  }

  return true;
};

/**
 * @description Performs a shallow comparison between two maps.
 */
export const isEqualMap = <K, V>(map1: Map<K, V>, map2: Map<K, V>): map1 is Map<K, V> => {
  if (map1.size !== map2.size) return false;

  for (const [key, value] of map1) {
    const $value2 = map2.get(key);

    if (value !== $value2) return false;
  }

  return true;
};

/**
 * @description Performs a shallow comparison between two sets.
 */
export const isEqualSet = <T>(set1: Set<T>, set2: Set<T>): set1 is Set<T> => {
  if (set1.size !== set2.size) return false;

  for (const value of set1) {
    if (!set2.has(value)) return false;
  }

  return true;
};

/**
 * @description Performs a shallow comparison between two objects.
 */
export const isEqualObject = <T extends Record<string, unknown>>(value1: T, value2: T): boolean => {
  const keys1 = Object.keys(value1);
  const keys2 = Object.keys(value2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    const propObject1 = value1[key];
    const propObject2 = value2[key];

    if (propObject1 !== propObject2) return false;
  }

  return true;
};

export default shallowCompare;
