import { createGlobalState } from 'react-global-state-hooks';

export type User = { id: number; name: string; email: string };

export type AuthState = {
  user: User | null;
  token: string | null;
};

/**
 * Store with sync + async actions and non-reactive metadata.
 * Consumed from the web variant `react-global-state-hooks` to exercise both
 * packages against the same debug hook.
 */
export const useAuth = createGlobalState(
  { user: null, token: null } as AuthState,
  {
    name: 'auth',
    metadata: { isLoading: false, lastError: null as string | null },
    actions: {
      login(email: string, password: string) {
        return async ({ setState, setMetadata }) => {
          setMetadata((m) => ({ ...m, isLoading: true, lastError: null }));

          // Fake async request so the async action lifecycle shows up in DevTools.
          await new Promise((resolve) => setTimeout(resolve, 600));

          if (!password) {
            setMetadata((m) => ({ ...m, isLoading: false, lastError: 'Password required' }));
            return { success: false as const, error: 'Password required' };
          }

          const user: User = { id: 1, name: email.split('@')[0] || 'user', email };
          setState({ user, token: `token-${Date.now()}` });
          setMetadata((m) => ({ ...m, isLoading: false }));

          return { success: true as const, user };
        };
      },

      logout() {
        return ({ setState }) => {
          setState({ user: null, token: null });
        };
      },

      refreshToken() {
        return async ({ setState, getState }) => {
          await new Promise((resolve) => setTimeout(resolve, 300));
          const current = getState();
          if (!current.user) return { success: false as const };
          setState((s) => ({ ...s, token: `token-${Date.now()}` }));
          return { success: true as const };
        };
      },
    },
  },
);
