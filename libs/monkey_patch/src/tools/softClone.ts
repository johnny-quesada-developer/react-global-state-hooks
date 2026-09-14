import isDate from 'json-storage-formatter/isDate';
import isPrimitive from 'json-storage-formatter/isPrimitive';
import isRecord from 'react-global-state-hooks/isRecord';
import type { Any } from 'react-global-state-hooks/types';

export function isReactElement(object: Any): boolean {
  return isRecord(object) && Boolean(object._reactName);
}

export const isNonSerializable = (
  value: unknown,
): value is ((...args: never[]) => unknown) | symbol | bigint => {
  if (
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    typeof value === 'bigint' ||
    (typeof Element !== 'undefined' && value instanceof Element) ||
    isReactElement(value)
  ) {
    return true;
  }

  return false;
};

const getPlaceholder = <T>(obj: T): T => {
  if (isReactElement(obj)) {
    return {
      __non_serializable__: 'react_element',
    } as T;
  }

  if (Array.isArray(obj)) {
    return {
      __non_serializable__: 'array',
    } as T;
  }

  if (obj instanceof Map) {
    return {
      __non_serializable__: 'map',
    } as T;
  }

  if (obj instanceof Set) {
    return {
      __non_serializable__: 'set',
    } as T;
  }

  return {
    __non_serializable__: typeof obj,
  } as T;
};

const clone = <T>(obj: T, seen = new WeakSet()): T => {
  if (isPrimitive(obj) || isDate(obj)) {
    return obj;
  }

  if (isNonSerializable(obj)) {
    return {
      __non_serializable__: typeof obj,
    } as T;
  }

  if (seen.has(obj as object)) {
    return getPlaceholder(obj);
  }

  seen.add(obj as object);

  const isArray = Array.isArray(obj);

  if (isArray) {
    return obj.map((item) => clone(item, seen)) as T;
  }

  const isMap = obj instanceof Map;

  if (isMap) {
    const pairs = Array.from(obj.entries());

    return new Map(pairs.map((pair) => clone(pair, seen))) as T;
  }

  const isSet = obj instanceof Set;

  if (isSet) {
    const values = Array.from(obj.values());

    return new Set(values.map((value) => clone(value, seen))) as T;
  }

  const keys = Object.keys(obj as Record<string, unknown>);
  const copy = Object.create(null);

  for (const key of keys) {
    const value = obj[key as keyof T];

    copy[key] = clone(value, seen);
  }

  return copy as T;
};

export const softClone = <T>(_obj: T): T => {
  try {
    return clone(_obj, new WeakSet());
  } catch {
    return getPlaceholder(_obj);
  }
};
