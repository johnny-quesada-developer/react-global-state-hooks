import { createGlobalState } from 'react-global-state-hooks';

export const useCounter = createGlobalState(
  { count: 0 },
  {
    actions: {
      increment(by = 1) {
        return ({ setState }) => {
          setState((state) => ({ ...state, count: state.count + by }));
        };
      },
      reset() {
        return ({ setState }) => {
          setState({ count: 0 });
        };
      },
    },
  },
);
