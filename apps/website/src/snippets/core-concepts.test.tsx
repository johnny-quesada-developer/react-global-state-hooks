import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CartSummary, useCart } from './stores/cart-store';
import { recordRequest, useFeed } from './stores/metadata';
import { TodoList, useTodos as useFilterTodos } from './selectors/filter-with-dependencies';
import { ActiveUsers, useActiveUsers, useStore, useUsers } from './selectors/selector-hooks';
import { count$, seen, stop, useCounter as useObservedCounter } from './selectors/observable';
import { useTodos as useActionTodos } from './actions/todo-actions';
import { counterActions, useCounter as useExternalCounter } from './actions/external-actions';
import { Counter, CounterContext, TwoCounters } from './context/counter-context';

afterEach(cleanup);

describe('stores: anatomy of the hook', () => {
  it('returns [state, setState, metadata]', () => {
    render(<CartSummary />);
    expect(screen.getByRole('button').textContent).toBe('0 items (USD)');

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button').textContent).toBe('1 items (USD)');
    act(() => useCart.reset({ items: [] }, { currency: 'USD' }));
  });

  it('carries the store API on the hook itself', () => {
    const api = [
      'getState',
      'setState',
      'subscribe',
      'select',
      'use',
      'createSelectorHook',
      'createObservable',
      'getMetadata',
      'setMetadata',
      'reset',
      'dispose',
    ] as const;

    api.forEach((name) => expect(typeof useCart[name]).toBe('function'));
    expect(useCart.metadata).toEqual({ currency: 'USD' });
  });
});

describe('metadata', () => {
  it('changing metadata does not re-render subscribers', () => {
    let renders = 0;
    const Probe = () => {
      useFeed();
      renders += 1;
      return null;
    };
    render(<Probe />);
    const before = renders;

    act(() => {
      recordRequest();
    });

    expect(useFeed.metadata.requests).toBe(1);
    expect(renders).toBe(before);
  });
});

describe('metadata in actions', () => {
  it('destructuring metadata copies the object; tools.metadata stays live', async () => {
    const { createGlobalState } = await import('react-global-state-hooks');
    const seen: { destructured: number; live: number }[] = [];

    const store = createGlobalState(0, {
      metadata: { n: 0 },
      actions: {
        run() {
          return (tools) => {
            const { metadata, setMetadata } = tools;
            setMetadata({ n: 1 });
            seen.push({ destructured: metadata.n, live: tools.metadata.n });
          };
        },
      },
    });

    store.actions.run();

    expect(seen).toEqual([{ destructured: 0, live: 1 }]);
  });
});

describe('selectors: dependencies and selector hooks', () => {
  it('re-selects when a dependency changes, without touching the store', () => {
    render(<TodoList />);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Ship examples', 'Review']);

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Write docs']);
    expect(useFilterTodos.getState().todos).toHaveLength(3);
  });

  it('selector hooks return the value (not a tuple), chain, and skip unrelated changes', () => {
    render(<ActiveUsers />);
    expect(screen.getByText('Ada')).toBeTruthy();

    expect(useUsers.getState()).toHaveLength(2);
    expect(useActiveUsers.getState().map((user) => user.name)).toEqual(['Ada']);

    let renders = 0;
    const Probe = () => {
      useActiveUsers();
      renders += 1;
      return null;
    };
    render(<Probe />);
    const before = renders;

    // unrelated field changes: the derived list keeps its identity, so nothing re-renders
    act(() => useStore.setState((state) => ({ ...state, currentUserId: 2 })));
    expect(renders).toBe(before);

    // the derived list changes: it does
    act(() =>
      useStore.setState((state) => ({
        ...state,
        users: state.users.map((user) => ({ ...user, active: true })),
      })),
    );
    expect(renders).toBe(before + 1);
    expect(screen.getByText('Ada, Grace')).toBeTruthy();
  });

  it('observables subscribe without a component and can be stopped', () => {
    expect(seen).toEqual([0]);

    act(() => useObservedCounter.setState((state) => ({ ...state, count: 1 })));
    act(() => useObservedCounter.setState((state) => ({ ...state, label: 'other' })));
    expect(seen).toEqual([0, 1]);
    expect(count$.getState()).toBe(1);

    stop();
    act(() => useObservedCounter.setState((state) => ({ ...state, count: 2 })));
    expect(seen).toEqual([0, 1]);
  });
});

describe('actions', () => {
  beforeEach(() => useActionTodos.reset({ todos: [], nextId: 1 }, {}));

  it('mutates through named actions, returns values, and calls sibling actions', () => {
    const { actions } = useActionTodos;

    actions.add('first');
    expect(actions.addMany(['second', 'third'])).toBe(2);
    actions.toggle(2);

    expect(useActionTodos.getState().todos.map((todo) => [todo.id, todo.done])).toEqual([
      [1, false],
      [2, true],
      [3, false],
    ]);
  });

  it('external actions extend a store and can call each other with this', () => {
    useExternalCounter.setState(1);

    counterActions.double();
    expect(useExternalCounter.getState()).toBe(2);

    counterActions.quadruple();
    expect(useExternalCounter.getState()).toBe(8);
  });

  it('an action that does not return a function is reported', async () => {
    const { createGlobalState } = await import('react-global-state-hooks');
    const store = createGlobalState(0, {
      // the types do not catch this, the store reports it when the action runs
      actions: { broken: () => 1 },
    });

    expect(() => store.actions.broken()).toThrow(/broken/);
  });
});

describe('context', () => {
  it('each Provider owns an independent store; value seeds it', () => {
    render(<TwoCounters />);

    fireEvent.click(screen.getByText(/left/));
    fireEvent.click(screen.getByText(/right/));
    fireEvent.click(screen.getByText(/right/));

    expect(screen.getByText('left: 1')).toBeTruthy();
    expect(screen.getByText('right: 12')).toBeTruthy();
  });

  it('use throws outside a Provider', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Counter label="x" />)).toThrow('use hook must be used within a ContextProvider');
    error.mockRestore();
  });

  it('a function value receives the context initial value (not a parent Provider value)', () => {
    let received: unknown;
    const Show = () => {
      const [state] = CounterContext.use();
      return <span>{state.count}</span>;
    };

    render(
      <CounterContext.Provider value={{ count: 5 }}>
        <CounterContext.Provider
          value={(initial) => {
            received = initial;
            return { count: 99 };
          }}
        >
          <Show />
        </CounterContext.Provider>
      </CounterContext.Provider>,
    );

    expect(received).toEqual({ count: 0 });
    expect(screen.getByText('99')).toBeTruthy();
  });

  it('a value prop is followed when it changes, and remounting a provider resets its state', () => {
    const { rerender } = render(
      <CounterContext.Provider value={{ count: 1 }}>
        <Counter label="v" />
      </CounterContext.Provider>,
    );
    expect(screen.getByText('v: 1')).toBeTruthy();

    rerender(
      <CounterContext.Provider value={{ count: 2 }}>
        <Counter label="v" />
      </CounterContext.Provider>,
    );
    expect(screen.getByText('v: 2')).toBeTruthy();

    cleanup();
    render(
      <CounterContext.Provider>
        <Counter label="m" />
      </CounterContext.Provider>,
    );
    fireEvent.click(screen.getByText('m: 0'));
    expect(screen.getByText('m: 1')).toBeTruthy();

    cleanup();
    render(
      <CounterContext.Provider>
        <Counter label="m" />
      </CounterContext.Provider>,
    );
    expect(screen.getByText('m: 0')).toBeTruthy();
  });

  it('makeProviderWrapper exposes the store to tests', () => {
    const { wrapper: Wrapper, context } = CounterContext.Provider.makeProviderWrapper();

    render(<Counter label="t" />, { wrapper: Wrapper });
    act(() => context.current.actions.increment(3));

    expect(screen.getByText('t: 3')).toBeTruthy();
  });
});
