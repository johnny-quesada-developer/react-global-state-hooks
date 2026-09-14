import $it from './$it';
import { act } from '@testing-library/react';
import { createGlobalState } from 'global-state-hooks-under-test';

/**
 * Referential stability of the value returned by the hook.
 *
 * Consumers put the state mutator (and derived getters/actions) directly into React dependency
 * arrays (`useEffect`, `useMemo`, ...). If the hook returned a NEW function reference on every
 * render — or worse, on every state change — those effects would re-run spuriously. The mutator
 * must therefore be stable for the lifetime of the store, including across state updates and
 * re-renders. These tests guard that contract for every variant.
 */
describe('hook return stability', () => {
  $it('keeps the state setter referentially stable across re-renders', ({ renderHook }) => {
    const useCount = createGlobalState(0);

    const { result, rerender } = renderHook(() => useCount());

    const firstSetter = result.current[1];

    rerender();
    rerender();

    expect(result.current[1]).toBe(firstSetter);
  });

  $it('keeps the state setter stable across state changes', ({ renderHook }) => {
    const useCount = createGlobalState(0);

    const { result } = renderHook(() => useCount());

    const setterBefore = result.current[1];

    act(() => {
      // setter shape differs per variant (plain setState); call it generically
      (result.current[1] as (value: number) => void)(1);
    });

    expect(result.current[0]).toBe(1);
    // the same setter reference must survive the state update
    expect(result.current[1]).toBe(setterBefore);
  });

  $it('keeps the actions object stable across re-renders and state changes', ({ renderHook }) => {
    const useCount = createGlobalState(0, {
      actions: {
        increase() {
          return ({ setState, getState }) => {
            setState(getState() + 1);
          };
        },
      },
    });

    const { result, rerender } = renderHook(() => useCount());

    const actionsBefore = result.current[1] as { increase: () => void };

    rerender();
    expect(result.current[1]).toBe(actionsBefore);

    act(() => {
      actionsBefore.increase();
    });

    expect(result.current[0]).toBe(1);
    // actions map identity survives the state update, and individual actions stay stable too
    expect(result.current[1]).toBe(actionsBefore);
    expect((result.current[1] as { increase: () => void }).increase).toBe(actionsBefore.increase);
  });

  $it('keeps a derived-selector hook stable and its setter stable across renders', ({ renderHook }) => {
    const useUser = createGlobalState({ name: 'Ada', age: 36 });

    const { result, rerender } = renderHook(() => useUser((s) => s.name));

    const selectedSetter = result.current[1];
    expect(result.current[0]).toBe('Ada');

    rerender();

    expect(result.current[1]).toBe(selectedSetter);
  });
});
