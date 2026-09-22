import { createGlobalState } from 'react-global-state-hooks';

// One call creates a store and returns its hook.
export const useCounter = createGlobalState({
  count: 0,
  step: 1,
});
