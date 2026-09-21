import { createGlobalState } from 'react-global-state-hooks';

export interface User {
  id: number;
  name: string;
}

export interface UsersState {
  status: 'idle' | 'loading' | 'success' | 'error';
  users: User[];
  error: string | null;
  attempts: number;
}

export type FetchUsers = () => Promise<User[]>;

const initial: UsersState = { status: 'idle', users: [], error: null, attempts: 0 };

/** The fetcher is injected, so tests (and the demo) control what the "server" does. */
export function createUsersStore(fetchUsers: FetchUsers) {
  return createGlobalState(initial, {
    // Bookkeeping that no component displays belongs in metadata: changing it never renders anything.
    metadata: { latestRequest: 0 },

    actions: {
      load() {
        // Keep `tools` whole: `tools.metadata` is a live getter, but destructuring it copies the object as it
        // is right now, which would be out of date after setMetadata.
        return async (tools) => {
          const { setState, setMetadata } = tools;
          const requestId = tools.metadata.latestRequest + 1;
          setMetadata({ latestRequest: requestId });

          setState((state) => ({ ...state, status: 'loading', error: null, attempts: state.attempts + 1 }));

          try {
            const users = await fetchUsers();

            // a newer request started while this one was in flight: ignore this late answer
            if (tools.metadata.latestRequest !== requestId) return;

            setState((state) => ({ ...state, status: 'success', users }));
          } catch (error) {
            if (tools.metadata.latestRequest !== requestId) return;

            setState((state) => ({
              ...state,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            }));
          }
        };
      },
    },
  });
}
