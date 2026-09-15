import { vi } from 'vitest';

// A fake async storage used by the persistence suites (web localStorage-style and native
// async-storage). The delay is intentionally short (0ms / next macrotask): some native tests
// wait only a couple of milliseconds for the `isAsyncStorageReady` flag to flip, so a longer
// delay would make them flake or time out.
export const getFakeAsyncStorage = () => {
  const dictionary = new Map<string, string>();

  const fakeAsyncStorage = {
    getItem: vi.fn((key): Promise<string | null> => {
      return new Promise<string | null>((resolve) => {
        setTimeout(() => {
          const value = dictionary.get(key) ?? null;

          resolve(value);
        }, 0);
      });
    }),
    setItem: vi.fn((key, value): Promise<void> => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);

          dictionary.set(key, jsonValue);
          resolve();
        }, 0);
      });
    }),
  };

  return { fakeAsyncStorage, dictionary };
};
