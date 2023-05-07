import { GlobalStoreConfig } from './GlobalStore.types';

import {
  formatFromStore,
  formatToStore,
} from 'react-native-global-state-hooks';

/**
 * @description
 * Get an item from local storage using the config provided.
 */
export const getLocalStorageItem = <T = any, TState = any, TMetadata = any>({
  config,
}: {
  config: GlobalStoreConfig<TState, TMetadata>;
}): T => {
  const localStorageKey = config?.localStorage?.key;
  if (!localStorageKey) return null;

  const storedItem = localStorage.getItem(localStorageKey) as string;

  if (storedItem === null) return null;

  const json = (() => {
    const { decrypt, encrypt } = config?.localStorage ?? {};

    if (!decrypt && !encrypt) return storedItem;

    if (typeof decrypt === 'function') {
      return decrypt(storedItem);
    }

    return atob(storedItem);
  })();

  const value = formatFromStore<T>(json, {
    jsonParse: true,
  });

  return value;
};

/**
 * @description
 * Set an item to local storage using the config provided.
 */
export const setLocalStorageItem = <T, TState = any, TMetadata = any>({
  item,
  config,
}: {
  config: GlobalStoreConfig<TState, TMetadata>;
  item: T;
}): void => {
  const localStorageKey = config?.localStorage?.key;
  if (!localStorageKey) return null;

  const json = formatToStore(item, {
    stringify: true,
    excludeTypes: ['function'],
  });

  const parsed = (() => {
    const { encrypt } = config?.localStorage ?? {};

    if (!encrypt) return json;

    if (typeof encrypt === 'function') {
      return encrypt(json);
    }

    return btoa(json);
  })();

  localStorage.setItem(localStorageKey, parsed);
};
