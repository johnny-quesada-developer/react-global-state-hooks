import { createGlobalState } from 'react-global-state-hooks';

export const log: string[] = [];

export const useGuarded = createGlobalState(
  { count: 0 },
  {
    name: 'guarded-counter',
    metadata: { changes: 0 },
    callbacks: {
      // Runs when the store is created. May return a cleanup function.
      onInit: ({ getState }) => {
        log.push(`init:${getState().count}`);

        return () => log.push('cleanup');
      },

      // Runs after each accepted state change.
      onStateChanged: ({ previousState, state, setMetadata }) => {
        log.push(`changed:${previousState.count}->${state.count}`);
        setMetadata((metadata: { changes: number }) => ({ changes: metadata.changes + 1 }));
      },

      // Return true to reject a change before it is applied.
      computePreventStateChange: ({ state }) => state.count < 0,
    },
  },
);
