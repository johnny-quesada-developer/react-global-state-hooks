import { describe, expect, it } from 'vitest';
import { getStoreLabel, getStoreLocation, getStoreSelector, isUnnamedStore } from '../storeInfo';

const viteStack = `Error
    at new GlobalStore (http://localhost:5199/@fs/repo/libs/universal/src/GlobalStore.ts:126:24)
    at createGlobalState (http://localhost:5199/@fs/repo/libs/universal/src/createGlobalState.ts:40:10)
    at http://localhost:5199/src/components/ShoppingCart.tsx:23:31
    at renderWithHooks (http://localhost:5199/node_modules/.vite/deps/react-dom.js:11548:26)`;

describe('getStoreLocation', () => {
  it('returns the first application frame as file:line', () => {
    expect(getStoreLocation(viteStack)).toBe('src/components/ShoppingCart.tsx:23');
  });

  it('skips dependency frames and understands absolute file paths', () => {
    const stack = `Error
    at new GlobalStore (/app/node_modules/react-hooks-global-states/dist/index.js:1:1)
    at Object.<anonymous> (/app/src/store.ts:9:20)`;

    expect(getStoreLocation(stack)).toBe('app/src/store.ts:9');
  });

  it('returns null when nothing usable is in the stack', () => {
    expect(getStoreLocation('')).toBeNull();
    expect(getStoreLocation('Error\n    at new GlobalStore (/x/libs/universal/src/GlobalStore.ts:1:1)')).toBeNull();
  });
});

describe('store identity', () => {
  it('treats generated gs: names as unnamed', () => {
    expect(isUnnamedStore('gs:abc')).toBe(true);
    expect(isUnnamedStore('todos')).toBe(false);
  });

  it('labels named stores by name and unnamed stores by location', () => {
    expect(getStoreLabel({ name: 'todos', globalStatePath: viteStack })).toBe('todos');
    expect(getStoreLabel({ name: 'gs:1', globalStatePath: viteStack })).toBe('unnamed src/components/ShoppingCart.tsx:23');
    expect(getStoreLabel({ name: 'gs:1', globalStatePath: '' })).toBe('unnamed');
  });

  it('selects by name, or by creation path when unnamed, so ids never leak', () => {
    expect(getStoreSelector({ name: 'todos', globalStatePath: 'x' })).toBe('n:todos');
    expect(getStoreSelector({ name: 'gs:1', globalStatePath: 'x' })).toBe(getStoreSelector({ name: 'gs:2', globalStatePath: 'x' }));
  });
});
