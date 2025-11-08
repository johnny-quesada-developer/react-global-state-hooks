import React from 'react';

beforeEach(() => {
  jest.spyOn(React, 'useState').mockImplementation((...[initialState]: unknown[]) => {
    const value = typeof initialState === 'function' ? initialState() : initialState;

    const setState = jest.fn(
      (() => {
        let state: unknown;

        return jest.fn((setter) => {
          const newState = typeof setter === 'function' ? setter(state) : setter;

          state = newState;
        });
      })(),
    );

    return [value, setState];
  });

  Object.defineProperty(globalThis, 'atob', {
    value: jest.fn((value) => {
      if (value === null) return '\x9Eée';

      return Buffer.from(value, 'base64').toString('ascii');
    }),
    configurable: true,
  });

  Object.defineProperty(globalThis, 'btoa', {
    value: jest.fn((value) => {
      return Buffer.from(value).toString('base64');
    }),
    configurable: true,
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

  jest.spyOn(React, 'useEffect').mockImplementation(mockMemo);

  jest.spyOn(React, 'useLayoutEffect').mockImplementation(mockMemo);

  jest.spyOn(React, 'useMemo').mockImplementation(mockMemo);

  let indexRef = 0;
  const mapRef = new Map();

  const mockUseRef = jest.fn((initialValue) => {
    indexRef += 1;

    const previous = mapRef.get(indexRef);
    if (previous) return previous;

    const value = {
      current: initialValue,
    };

    mapRef.set(indexRef, value);

    return value;
  });

  jest.spyOn(React, 'useRef').mockImplementation(mockUseRef);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.clearAllTimers();
  window.localStorage.clear();
});

export {};
