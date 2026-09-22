import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TasksDemo } from './TasksDemo';
import { useOpenCount, useTasks } from './store';

afterEach(() => {
  cleanup();
  useTasks.reset();
});

const count = (name: string) =>
  Number(
    within(screen.getByRole(name === 'Add task' ? 'form' : 'region', { name })).getAllByTestId(
      'render-count',
    )[0].textContent,
  );

const rowCount = (text: string) =>
  Number(within(screen.getByText(text).closest('li')!).getByTestId('render-count').textContent);

describe('tasks store', () => {
  it('adds, toggles, removes and clears through actions', () => {
    const { actions } = useTasks;

    actions.add('  New one  ');
    actions.add('   ');
    expect(useTasks.getState().tasks.map((task) => task.text)).toEqual([
      'Write the docs',
      'Ship the examples',
      'Review feedback',
      'New one',
    ]);

    actions.toggle(4);
    expect(useOpenCount.getState()).toBe(2);

    actions.clearDone();
    expect(useTasks.getState().tasks.map((task) => task.id)).toEqual([2, 3]);

    actions.remove(2);
    expect(useTasks.getState().tasks.map((task) => task.id)).toEqual([3]);
  });

  it('reset restores the seed data', () => {
    useTasks.actions.clearDone();
    useTasks.reset();

    expect(useTasks.getState().tasks).toHaveLength(3);
    expect(useTasks.getState().nextId).toBe(4);
  });
});

describe.each([
  ['plain render', (ui: React.ReactElement) => ui],
  ['React.StrictMode', (ui: React.ReactElement) => <StrictMode>{ui}</StrictMode>],
])('TasksDemo (%s)', (_label, wrap) => {
  it('filters with a dependency and keeps the store unchanged', () => {
    render(wrap(<TasksDemo />));
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);

    fireEvent.click(screen.getByLabelText('open'));
    expect(screen.queryByText('Write the docs')).toBeNull();
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);

    fireEvent.click(screen.getByLabelText('done'));
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(useTasks.getState().tasks).toHaveLength(3);
  });

  it('a toggle re-renders the list, the stats and only the toggled row', () => {
    render(wrap(<TasksDemo />));
    const before = { form: count('Add task'), stats: count('Task stats'), list: count('Task list') };

    fireEvent.click(screen.getByLabelText('Ship the examples'));

    expect(count('Add task')).toBe(before.form);
    expect(count('Task stats')).toBe(before.stats + 1);
    expect(count('Task list')).toBe(before.list + 1);
    expect(rowCount('Ship the examples')).toBe(2);
    expect(rowCount('Review feedback')).toBe(1);
    expect(screen.getByText('1 open, 2 done')).toBeTruthy();
  });

  it('the add form types without touching the store, then adds a task', () => {
    render(wrap(<TasksDemo />));
    const listRenders = count('Task list');

    fireEvent.change(screen.getByLabelText('New task'), { target: { value: 'Try it' } });
    expect(count('Task list')).toBe(listRenders);

    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
    expect(screen.getByText('Try it')).toBeTruthy();
    expect(count('Task list')).toBe(listRenders + 1);
  });

  it('reset demo restores tasks and counters', () => {
    render(wrap(<TasksDemo />));
    act(() => useTasks.actions.clearDone());
    fireEvent.click(screen.getByRole('button', { name: 'Reset demo' }));

    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(count('Task stats')).toBe(1);
  });
});
