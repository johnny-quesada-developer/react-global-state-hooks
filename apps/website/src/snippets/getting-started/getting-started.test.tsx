import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useCounter as basicCounter } from './Counter';
import { CounterButton } from './read-and-update';
import { Labels } from './Labels';
import { useCounter as actionsCounter } from './actions';
import { Counter } from './use-actions';
import { usePreferences } from './persist';

// `reset()` with no arguments keeps the current state unless the store was created from a lazy
// initializer, so the tests pass the initial values explicitly.
afterEach(() => {
  cleanup();
  basicCounter.reset({ count: 0, step: 1 }, {});
  actionsCounter.reset({ count: 0 }, {});
});

describe('read-and-update', () => {
  it('updates the whole state from a component', () => {
    render(<CounterButton />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button').textContent).toBe('Count: 2');
    expect(basicCounter.getState()).toEqual({ count: 2, step: 1 });
  });
});

describe('select-a-slice', () => {
  it('re-renders a selector only when its slice changes', () => {
    let countRenders = 0;
    const Spy = () => {
      const [count] = basicCounter((state) => state.count);
      countRenders += 1;
      return <span data-testid="spy">{count}</span>;
    };

    render(
      <>
        <Spy />
        <Labels />
      </>,
    );
    const initial = countRenders;
    expect(screen.getByTestId('spy').textContent).toBe('0');

    act(() => basicCounter.setState((s) => ({ ...s, step: 5 })));
    expect(countRenders).toBe(initial);

    act(() => basicCounter.setState((s) => ({ ...s, count: 3 })));
    expect(countRenders).toBe(initial + 1);
    expect(screen.getByTestId('spy').textContent).toBe('3');
  });

  it('select returns the selected value', () => {
    render(<Labels />);
    act(() => basicCounter.setState((s) => ({ ...s, step: 7 })));

    expect(screen.getByText('7')).toBeTruthy();
  });
});

describe('actions', () => {
  it('exposes actions as the second tuple item', () => {
    render(<Counter />);

    fireEvent.click(screen.getByText('+1'));
    fireEvent.click(screen.getByText('+10'));
    expect(screen.getByRole('status').textContent).toBe('11');

    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getByRole('status').textContent).toBe('0');
  });
});

describe('persist', () => {
  it('saves to localStorage under the configured key', () => {
    usePreferences.setState({ theme: 'dark', compact: true });

    const saved = JSON.parse(window.localStorage.getItem('preferences') ?? 'null');
    expect(saved.s).toEqual({ theme: 'dark', compact: true });
  });
});
