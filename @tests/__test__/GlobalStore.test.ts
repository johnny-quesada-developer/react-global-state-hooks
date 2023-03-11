import { GlobalStore } from '../../src/GlobalStore';
import { useState, useEffect } from 'react';
import { formatFromStore } from 'json-storage-formatter';

describe('GlobalStore Basic', () => {
  it('should be able to create a new instance with state', () => {
    const stateValue = 'test';
    const store = new GlobalStore(stateValue, {
      encrypt: false,
    });

    expect(store).toBeInstanceOf(GlobalStore);
    expect((store as unknown as { state: unknown }).state).toBe(stateValue);
  });

  it('state setter should be a function', () => {
    const stateValue = 'test';
    const store = new GlobalStore(stateValue, {
      encrypt: false,
    });

    const [, setState] = store.getHookDecoupled();

    expect(setState).toBeInstanceOf(Function);
  });

  it('should be able to get the state', () => {
    const stateValue = 1;
    const store = new GlobalStore(stateValue, {
      // by default, the state is encrypted to base64, but you can disable it, or use a custom encryptor
      encrypt: false,
    });

    const [getState] = store.getHookDecoupled();

    expect(getState()).toBe(stateValue);
  });

  it('should be able to set the state', () => {
    const stateValue = 'test';
    const store = new GlobalStore(stateValue, {
      encrypt: false,
    });

    const [, setState] = store.getHookDecoupled();

    setState('test2');

    expect((store as unknown as { state: unknown }).state).toBe('test2');
  });

  it('should notifiy initialize all subscribers of the store', () => {
    const stateValue = 'test';
    const stateValue2 = 'test2';

    const store = new GlobalStore(stateValue, {
      encrypt: false,
    });

    const useHook = store.getHook();
    const [getState, setState] = store.getHookDecoupled();

    useHook();
    useHook();

    const [setter1, setter2] = store.subscribers;

    setState(stateValue2);

    expect(getState()).toBe(stateValue2);
    expect(useState).toHaveBeenCalledTimes(2);
    expect(useEffect).toHaveBeenCalledTimes(2);

    expect(setter1).toBeCalledTimes(1);
    expect(setter2).toBeCalledTimes(1);
  });
});

describe('GlobalStore Persistence', () => {
  it('should be able to persist the state', () => {
    const stateValue = 'test';

    const store = new GlobalStore(stateValue, {
      localStorageKey: 'key1',
      encrypt: false,
    });

    const [getState] = store.getHookDecoupled();

    expect(localStorage.setItem).toBeCalledTimes(1);
    expect(localStorage.setItem).toBeCalledWith(
      'key1',
      JSON.stringify(stateValue)
    );

    expect(getState()).toBe(stateValue);
  });

  it('should be able to restore the state', () => {
    localStorage.setItem('key1', '"test"');

    const store = new GlobalStore('', {
      localStorageKey: 'key1',
      encrypt: false,
    });

    const [getState] = store.getHookDecoupled();

    expect(getState()).toBe('test');

    expect(localStorage.getItem).toBeCalledTimes(1);
  });

  it('should be able to restore state type Set', () => {
    const stateValue = new Set(['test', 'test2']);

    new GlobalStore(stateValue, {
      localStorageKey: 'key1',
      encrypt: false,
    });

    const storedItem = localStorage.getItem('key1');
    const jsonParsed = JSON.parse(storedItem as string);

    const restoredState = formatFromStore(jsonParsed);

    expect(restoredState).toBeInstanceOf(Set);
    expect(restoredState).toEqual(stateValue);
  });

  it('should be able to restore state type Map', () => {
    const stateValue = new Map([
      ['test', 'test2'],
      ['test3', 'test4'],
    ]);

    new GlobalStore(stateValue, {
      localStorageKey: 'key1',
      encrypt: false,
    });

    const storedItem = localStorage.getItem('key1');
    const jsonParsed = JSON.parse(storedItem as string);

    const restoredState = formatFromStore(jsonParsed);

    expect(restoredState).toBeInstanceOf(Map);
    expect(restoredState).toEqual(stateValue);
  });

  it('should be able to restore state type Date', () => {
    const stateValue = new Date();

    new GlobalStore(stateValue, {
      localStorageKey: 'key1',
      encrypt: false,
    });

    const storedItem = localStorage.getItem('key1');
    const jsonParsed = JSON.parse(storedItem as string);

    const restoredState = formatFromStore(jsonParsed);

    expect(restoredState).toBeInstanceOf(Date);
    expect(restoredState).toEqual(stateValue);
  });
});
