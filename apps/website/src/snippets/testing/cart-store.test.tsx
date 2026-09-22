import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { CartContext, useCart } from './cart-store';

describe('global store', () => {
  // reset() returns the store to its initial state, so tests do not leak into each other
  beforeEach(() => useCart.reset());

  it('changes state through actions, without rendering anything', () => {
    useCart.actions.add('book');

    expect(useCart.getState().items).toEqual(['book']);
  });

  it('updates a component that uses the hook', () => {
    const { result } = renderHook(() => useCart((state) => state.items.length));
    expect(result.current[0]).toBe(0);

    act(() => useCart.actions.add('book'));

    expect(result.current[0]).toBe(1);
  });
});

describe('context store', () => {
  it('gets a fresh store per render, and exposes it through makeProviderWrapper', () => {
    const { wrapper, context } = CartContext.Provider.makeProviderWrapper();

    const { result } = renderHook(() => CartContext.use((state) => state.items), { wrapper });
    expect(result.current[0]).toEqual([]);

    act(() => context.current.actions.add('book'));

    expect(result.current[0]).toEqual(['book']);
  });
});
