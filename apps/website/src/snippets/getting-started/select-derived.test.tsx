import { act, cleanup, render, screen } from '@testing-library/react';
import { shallowCompare } from 'react-global-state-hooks';
import { afterEach, describe, expect, it } from 'vitest';
import { OpenTodos, useTodos } from './select-derived';

afterEach(cleanup);

const selectOpen = (state: ReturnType<typeof useTodos.getState>) => state.todos.filter((todo) => !todo.done);

describe('select-derived', () => {
  it('shows the derived value and follows changes to the items', () => {
    render(<OpenTodos />);
    expect(screen.getByText('1 open')).toBeTruthy();

    act(() =>
      useTodos.setState((state) => ({
        ...state,
        todos: [...state.todos, { id: 3, text: 'Review', done: false }],
      })),
    );
    expect(screen.getByText('2 open')).toBeTruthy();
    act(() =>
      useTodos.reset(
        {
          filter: 'all',
          todos: [
            { id: 1, text: 'Write docs', done: true },
            { id: 2, text: 'Ship examples', done: false },
          ],
        },
        {},
      ),
    );
  });

  it('a selector that builds a new array re-renders on every store change unless isEqual is set', () => {
    const renders = { strict: 0, shallow: 0 };
    const Strict = () => {
      useTodos(selectOpen);
      renders.strict += 1;
      return null;
    };
    const Shallow = () => {
      useTodos(selectOpen, { isEqual: shallowCompare });
      renders.shallow += 1;
      return null;
    };
    render(
      <>
        <Strict />
        <Shallow />
      </>,
    );

    // unrelated change: a new state object that keeps the same todos
    act(() => useTodos.setState((state) => ({ ...state, filter: 'done' })));

    expect(renders).toEqual({ strict: 2, shallow: 1 });
  });
});
