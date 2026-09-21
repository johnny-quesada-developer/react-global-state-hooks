import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AsyncDemo } from './AsyncDemo';
import { useServer, useUsers } from './fakeApi';
import { createUsersStore, type User } from './store';

const ada: User = { id: 1, name: 'Ada' };
const grace: User = { id: 2, name: 'Grace' };

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('createUsersStore', () => {
  it('goes idle -> loading -> success', async () => {
    const request = deferred<User[]>();
    const store = createUsersStore(() => request.promise);
    expect(store.getState().status).toBe('idle');

    const pending = store.actions.load();
    expect(store.getState()).toMatchObject({ status: 'loading', attempts: 1 });

    request.resolve([ada]);
    await pending;
    expect(store.getState()).toMatchObject({ status: 'success', users: [ada], error: null });
  });

  it('records the error, then a retry succeeds and clears it', async () => {
    const results = [Promise.reject(new Error('boom')), Promise.resolve([ada])];
    const store = createUsersStore(() => results.shift()!);

    await store.actions.load();
    expect(store.getState()).toMatchObject({ status: 'error', error: 'boom', attempts: 1 });

    await store.actions.load();
    expect(store.getState()).toMatchObject({ status: 'success', error: null, attempts: 2, users: [ada] });
  });

  it('ignores a late answer from an older request', async () => {
    const first = deferred<User[]>();
    const second = deferred<User[]>();
    const answers = [first, second];
    const store = createUsersStore(() => answers.shift()!.promise);

    const a = store.actions.load();
    const b = store.actions.load();

    second.resolve([grace]);
    await b;
    first.resolve([ada]);
    await a;

    expect(store.getState().users).toEqual([grace]);
  });

  it('changing the request bookkeeping never re-renders', () => {
    const store = createUsersStore(async () => []);
    let renders = 0;
    const listener = store.subscribe(
      () => {
        renders += 1;
      },
      { skipFirst: true },
    );

    store.setMetadata({ latestRequest: 99 });

    expect(renders).toBe(0);
    listener();
  });
});

describe('AsyncDemo', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useUsers.reset({ status: 'idle', users: [], error: null, attempts: 0 }, { latestRequest: 0 });
    useServer.reset({ failing: false }, {});
  });

  it('shows loading, then the users', async () => {
    render(<AsyncDemo />);
    expect(screen.getByRole('status').textContent).toBe('Nothing loaded yet.');

    fireEvent.click(screen.getByRole('button', { name: 'Load users' }));
    expect(screen.getByRole('status').textContent).toBe('Loading users…');
    expect((screen.getByRole('button', { name: 'Load users' }) as HTMLButtonElement).disabled).toBe(true);

    await act(() => vi.advanceTimersByTimeAsync(700));

    expect(screen.getByRole('status').textContent).toBe('Loaded 3 users.');
    expect(screen.getByText('Grace Hopper')).toBeTruthy();
  });

  it('shows the error, and Retry succeeds after the server recovers', async () => {
    render(<AsyncDemo />);
    fireEvent.click(screen.getByLabelText('Simulate a failing server'));

    fireEvent.click(screen.getByRole('button', { name: 'Load users' }));
    await act(() => vi.advanceTimersByTimeAsync(700));
    expect(screen.getByRole('status').textContent).toContain('Failed: The server did not respond');

    fireEvent.click(screen.getByLabelText('Simulate a failing server'));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await act(() => vi.advanceTimersByTimeAsync(700));

    expect(screen.getByRole('status').textContent).toBe('Loaded 3 users.');
    expect(screen.getByText('attempts: 2')).toBeTruthy();
  });

  it('reset demo returns to idle', async () => {
    render(<AsyncDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Load users' }));
    await act(() => vi.advanceTimersByTimeAsync(700));

    fireEvent.click(screen.getByRole('button', { name: 'Reset demo' }));

    expect(screen.getByRole('status').textContent).toBe('Nothing loaded yet.');
  });
});
