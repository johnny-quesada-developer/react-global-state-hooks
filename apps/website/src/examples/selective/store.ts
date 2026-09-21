import { createGlobalState } from 'react-global-state-hooks';

// A function initializer lets `useProfile.reset()` restore the original values.
export const useProfile = createGlobalState(() => ({
  name: 'Ada',
  role: 'Engineer',
  clicks: 0,
}));
