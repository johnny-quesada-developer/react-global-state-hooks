import { createGlobalState } from 'react-global-state-hooks';

export const useSession = createGlobalState({ token: null as string | null });

export function authHeader(): Record<string, string> {
  // Read the current value from any module, no hook required.
  const { token } = useSession.getState();

  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function signIn(token: string) {
  useSession.setState({ token });
}

// Subscribe to a slice. The callback runs immediately with the current value, then on every change.
export const unsubscribe = useSession.subscribe(
  (state) => state.token,
  (token) => {
    console.log('token changed:', token);
  },
);
