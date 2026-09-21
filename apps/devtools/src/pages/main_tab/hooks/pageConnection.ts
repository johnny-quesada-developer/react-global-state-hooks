import { createGlobalState } from 'react-global-state-hooks/createGlobalState';

export type PageConnectionStatus = 'waiting' | 'connecting' | 'stalled' | 'synced';

export const PAGE_CONNECTION_ATTEMPTS = 4;

export const pageConnection$ = createGlobalState(
  { status: 'waiting' as PageConnectionStatus, attempt: 1 },
  {
    name: 'pageConnection',
    actions: {
      restart() {
        return ({ setState }) => setState((state) => ({ ...state, status: 'waiting', attempt: 1 }));
      },
      connecting() {
        return ({ setState, getState }) => {
          if (getState().status === 'waiting') setState((state) => ({ ...state, status: 'connecting' }));
        };
      },
      attempted() {
        return ({ setState, getState }) => {
          if (getState().status === 'synced') return;
          setState((state) => ({ ...state, attempt: Math.min(state.attempt + 1, PAGE_CONNECTION_ATTEMPTS) }));
        };
      },
      stalled() {
        return ({ setState, getState }) => {
          if (getState().status !== 'synced') setState((state) => ({ ...state, status: 'stalled' }));
        };
      },
      synced() {
        return ({ setState }) => setState((state) => ({ ...state, status: 'synced' }));
      },
    },
  },
);
