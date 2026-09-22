import { actions, createGlobalState } from 'react-global-state-hooks';

export const useCounter = createGlobalState(1);

// Extend any store with extra actions without touching its definition.
export const counterActions = actions(useCounter, {
  double() {
    return ({ setState, getState }) => {
      setState(getState() * 2);
    };
  },

  // Actions in the same group call each other with `this`.
  quadruple() {
    return () => {
      this.double();
      this.double();
    };
  },
});
