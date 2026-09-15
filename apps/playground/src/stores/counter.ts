import { createGlobalState } from 'react-hooks-global-states';

/**
 * Simplest possible store: a primitive with the default setState mutator.
 * Consumed from the base `react-hooks-global-states` package.
 */
export const useCounter = createGlobalState(0, { name: 'counter' });
