import { afterEach, describe, expect, it, vi } from 'vitest';

describe('outside-react', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reads, writes and subscribes without a hook', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    // the module subscribes when it is evaluated, so import it after the spy exists
    const { authHeader, signIn, unsubscribe } = await import('./outside-react');

    expect(authHeader()).toEqual({});
    signIn('abc');
    expect(authHeader()).toEqual({ Authorization: 'Bearer abc' });

    expect(log).toHaveBeenCalledWith('token changed:', null);
    expect(log).toHaveBeenCalledWith('token changed:', 'abc');

    unsubscribe();
    signIn('def');
    expect(log).not.toHaveBeenCalledWith('token changed:', 'def');
  });
});
