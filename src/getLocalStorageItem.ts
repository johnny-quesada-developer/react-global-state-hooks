import { formatFromStore } from 'json-storage-formatter/formatFromStore';

import { LocalStorageConfig } from './types';

export const getLocalStorageItem = <T>(args: LocalStorageConfig): T | null => {
  const localStorageKeySource = args.key;
  if (!localStorageKeySource) return null;

  const localStorageKey = (() => {
    if (typeof localStorageKeySource === 'function') {
      return localStorageKeySource();
    }

    return localStorageKeySource;
  })();

  const storedItem = localStorage.getItem(localStorageKey) as string;

  if (storedItem === null) return null;

  const json = (() => {
    if (!args.decrypt && !args.encrypt) return storedItem;

    if (typeof args.decrypt === 'function') {
      return args.decrypt(storedItem);
    }

    return atob(storedItem);
  })();

  const value = formatFromStore<T>(json, {
    jsonParse: true,
  });

  return value;
};
