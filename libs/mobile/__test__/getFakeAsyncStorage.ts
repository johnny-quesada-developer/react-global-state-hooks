import { vi } from 'vitest';
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
          const stringValue = typeof value === "string" ? value : JSON.stringify(value);

          dictionary.set(key, stringValue);
          resolve();
        }, 0);
      });
    }),
  };

  return { fakeAsyncStorage, dictionary };
};
