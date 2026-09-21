import { createGlobalState } from 'react-global-state-hooks';

export const initialProfile = () => ({
  name: 'Ada',
  role: 'Engineer',
  clicks: 0,
});

export const useProfile = createGlobalState(initialProfile, { name: 'profile' });
