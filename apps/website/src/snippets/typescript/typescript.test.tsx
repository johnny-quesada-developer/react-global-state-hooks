import { render } from '@testing-library/react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { InferActionsType } from 'react-global-state-hooks';
import { useSession, useUser } from './typed-store';
import { bound, useCounter } from './split-actions';
import { FormContext, resetForm, type FormApi } from './context-types';

describe('typed stores', () => {
  it('infers state and action types', () => {
    expectTypeOf(useUser.getState()).toEqualTypeOf<{ id: string; name: string } | null>();
    expectTypeOf(useSession.getState().status).toEqualTypeOf<'idle' | 'loading' | 'error'>();

    type SessionActions = InferActionsType<typeof useSession>;
    expectTypeOf<SessionActions['signIn']>().parameters.toEqualTypeOf<[{ id: string; name: string }]>();

    // @ts-expect-error unknown status is rejected
    useSession.setState({ user: null, status: 'nope' });
  });

  it('runs actions', () => {
    useSession.actions.signIn({ id: '1', name: 'Ada' });
    expect(useSession.getState().user?.name).toBe('Ada');
  });
});

describe('split actions', () => {
  it('a template bound to the store can use the store actions', () => {
    useCounter.setState({ count: 0 });

    bound.incrementTwice();
    expect(useCounter.getState().count).toBe(2);

    bound.reset();
    expect(useCounter.getState().count).toBe(0);
  });
});

describe('context types', () => {
  it('InferAPI gives the store tools of a context', () => {
    expectTypeOf<FormApi['getState']>().returns.toEqualTypeOf<{ name: string; email: string }>();

    let api: FormApi | undefined;
    const Capture = () => {
      api = FormContext.use.api() as unknown as FormApi;
      return null;
    };
    render(
      <FormContext.Provider value={{ name: 'x', email: 'y' }}>
        <Capture />
      </FormContext.Provider>,
    );

    resetForm(api!);
    expect(api!.getState()).toEqual({ name: '', email: '' });
  });
});
