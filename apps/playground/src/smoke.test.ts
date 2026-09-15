import { describe, it, expect } from 'vitest';
import { useCounter } from './stores/counter';

// A minimal smoke test: confirms the playground resolves the state libraries from monorepo
// source (via the vite aliases) and that a store built with them works. The full behavioral
// coverage lives in the reusable suite (libs/test); this just guards the app wiring.
describe('playground smoke', () => {
  it('creates a working global state from the source-aliased base library', () => {
    expect(useCounter.getState()).toBe(0);

    useCounter.setState((c) => c + 5);
    expect(useCounter.getState()).toBe(5);

    useCounter.setState(0);
    expect(useCounter.getState()).toBe(0);
  });
});
