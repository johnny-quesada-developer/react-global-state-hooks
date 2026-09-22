import { createGlobalState } from 'react-global-state-hooks';

export type Profile = {
  name: string;
  role: string;
  clicks: number;
};

export const initialProfile = (): Profile => ({
  name: 'Ada',
  role: 'Engineer',
  clicks: 0,
});

export const useProfile = createGlobalState(initialProfile, {
  name: 'profile',
});
