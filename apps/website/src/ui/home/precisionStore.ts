import { createGlobalState } from 'react-global-state-hooks';

export type Theme = 'light' | 'dark';

export const initialProfile = () => ({ name: 'Ada', theme: 'light' as Theme });

/** The store behind the "One field changes" demo: a real shared store with two independent selections. */
export const useDemoProfile = createGlobalState(initialProfile, { name: 'precisionProfile' });

export const names = ['Ada', 'Grace', 'Lin'] as const;
