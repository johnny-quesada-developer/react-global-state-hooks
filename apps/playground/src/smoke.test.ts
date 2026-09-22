import { describe, it, expect } from 'vitest';
import { useCounter } from './stores/counter';

// Guards the playground’s source aliases and store wiring.
describe('playground smoke', () => {
  it('creates a working global state from the source-aliased base library', () => {
    expect(useCounter.getState()).toBe(0);

    useCounter.setState((c) => c + 5);
    expect(useCounter.getState()).toBe(5);

    useCounter.setState(0);
    expect(useCounter.getState()).toBe(0);
  });
});
