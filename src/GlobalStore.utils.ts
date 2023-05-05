import { GlobalStoreConfig } from 'GlobalStore.types';

import {
  formatFromStore,
  formatToStore,
} from 'react-native-global-state-hooks';

export const getLocalStorageItem = <T>({
  config,
  localStorageKey,
}: {
  localStorageKey: string;
  config: GlobalStoreConfig<any, any>;
}) => {
  if (!localStorageKey) return null;

  const storedItem = localStorage.getItem(localStorageKey) as string;

  if (storedItem === null) return null;

  const json = (() => {
    const { decrypt, encrypt } = config?.localStorage ?? {};
    if (!decrypt || !encrypt) return storedItem;

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

export const setLocalStorageItem = <T>({
  item,
  config,
  localStorageKey,
}: {
  localStorageKey: string;
  config: GlobalStoreConfig<any, any>;
  item: T;
}) => {
  if (!localStorageKey) return null;

  const json = formatToStore(item, {
    stringify: true,
    excludeTypes: ['function'],
  });

  const parsed = (() => {
    const { decrypt, encrypt } = config?.localStorage ?? {};

    if (!decrypt || !encrypt) return json;

    if (typeof encrypt === 'function') {
      return encrypt(json);
    }

    return btoa(json);
  })();

  localStorage.setItem(localStorageKey, parsed);
};
