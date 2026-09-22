import { createGlobalState } from 'react-global-state-hooks';

interface User {
  id: string;
  name: string;
}

// Without options, pass the state type as a type argument.
export const useUser = createGlobalState<User | null>(null);

interface Session {
  user: User | null;
  status: 'idle' | 'loading' | 'error';
}

// With options, annotate the initial value instead. A type argument plus options does not compile,
// because that overload has three type parameters.
const initial: Session = { user: null, status: 'idle' };

export const useSession = createGlobalState(initial, {
  actions: {
    start() {
      return ({ setState }) => {
        setState((session) => ({ ...session, status: 'loading' }));
      };
    },
    signIn(user: User) {
      return ({ setState }) => {
        setState({ user, status: 'idle' });
      };
    },
  },
});
