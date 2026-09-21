import { actions, createGlobalState, type InferAPI } from 'react-global-state-hooks';

export const useCounter = createGlobalState(
  { count: 0 },
  {
    actions: {
      increment() {
        return ({ setState }) => {
          setState((state) => ({ count: state.count + 1 }));
        };
      },
    },
  },
);

// The exact tools type of this store: state, actions, metadata and the store methods.
type CounterAPI = InferAPI<typeof useCounter>;

// A template typed against the store, defined before it is bound to anything.
export const extraActions = actions<CounterAPI>()({
  reset() {
    return ({ setState }) => {
      setState({ count: 0 });
    };
  },
  incrementTwice() {
    return ({ actions }) => {
      actions.increment();
      actions.increment();
    };
  },
});

// Bind it to the store when you need it.
export const bound = extraActions(useCounter);
