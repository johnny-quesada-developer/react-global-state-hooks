import { formatToStore } from 'json-storage-formatter/formatToStore';

import { LocalStorageConfig } from './types';

export const setLocalStorageItem = <T>(item: T, args: LocalStorageConfig): void => {
  const localStorageKeySource = args.key;
  if (!localStorageKeySource) return;

  const localStorageKey = (() => {
    if (typeof localStorageKeySource === 'function') {
      return localStorageKeySource();
    }

    return localStorageKeySource;
  })();

  const json = formatToStore(item, {
    stringify: true,
    excludeTypes: ['function'],
  });

  const parsed = (() => {
    if (!args.encrypt) return json;

    if (typeof args.encrypt === 'function') {
      return args.encrypt(json);
    }

    return btoa(json);
  })();

  localStorage.setItem(localStorageKey, parsed);
};

export default setLocalStorageItem;
