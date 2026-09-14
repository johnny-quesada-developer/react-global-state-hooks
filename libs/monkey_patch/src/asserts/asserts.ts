import isNil from 'json-storage-formatter/isNil';
import isRecord from 'react-global-state-hooks/isRecord';
import type { Any } from 'react-global-state-hooks/types';

export function assertIsNil(value: unknown, validation: string): asserts value is null | undefined {
  if (!isNil(value)) {
    throw new Error(validation);
  }
}

export function isNonNullable<T>(value: unknown): value is NonNullable<T> {
  return !isNil(value);
}

export function isError(value: unknown): value is Error {
  return isRecord(value) && isNonNullable(value.message);
}

export function assertIsNonNullable<T>(value: T, validation: string): asserts value is NonNullable<T> {
  if (isNil(value)) {
    throw new Error(validation);
  }
}

export function assetIsNumber(value: unknown, validation: string): asserts value is number {
  if (typeof value !== 'number') {
    throw new Error(validation);
  }
}

export function assertIsString(value: unknown, validation: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(validation);
  }
}

export function assertIsFunction<T extends (...args: Any[]) => unknown>(
  value: unknown,
  validation: string,
): asserts value is T {
  if (typeof value !== 'function') {
    throw new Error(validation);
  }
}

export function isFunction<T extends (...args: Any[]) => unknown>(value: unknown): value is T {
  return typeof value === 'function';
}
