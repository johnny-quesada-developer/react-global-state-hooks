import React from 'react';

beforeEach(() => {
  spyOn(React, 'useState').and.callFake(((initialState) => {
    const value =
      typeof initialState === 'function' ? initialState() : initialState;

    const setState = jest.fn(
      (() => {
        let state;

        return jest.fn((setter) => {
          const newState =
            typeof setter === 'function' ? setter(state) : setter;

          state = newState;
        });
      })()
    );

    return [value, setState];
  }) as any);

  const dictionary = new Map<string, string>();

  const localStorageMock = {
    dictionary,
    getItem: jest.fn((key) => {
      return dictionary.get(key) ?? null;
    }),
    setItem: jest.fn((key, value) => {
      const jsonValue = value.toString();

      dictionary.set(key, jsonValue);
    }),
  };

  (global as any).localStorage = localStorageMock;

  (global as any).atob = jest.fn((value) => {
    if (value === null) return '\x9Eée';

    return Buffer.from(value, 'base64').toString('ascii');
  });

  (global as any).btoa = jest.fn((value) => {
    return Buffer.from(value).toString('base64');
  });

  let index = 0;
  const map = new Map();

  const mockMemo = jest.fn((callback) => {
    index += 1;

    const previous = map.get(index);
    if (previous) return previous;

    const value = callback();

    map.set(index, value);

    return value;
  });

  spyOn(React, 'useEffect').and.callFake(mockMemo);

  spyOn(React, 'useLayoutEffect').and.callFake(mockMemo);

  spyOn(React, 'useMemo').and.callFake(mockMemo);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.clearAllTimers();
});

export {};
