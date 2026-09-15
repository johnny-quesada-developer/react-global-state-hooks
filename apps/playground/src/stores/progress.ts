import { createGlobalState } from 'react-hooks-global-states';

export type ProgressState = {
  value: number;
  running: boolean;
  rateMs: number;
};

/**
 * High-frequency store used to stress-test the DevTools: when running, the panel
 * fires a `tick` action every `rateMs`, producing a fast stream of actions/logs.
 * Useful to verify per-store reactivity (only the selected store re-renders),
 * log pagination, and log discarding under load.
 */
export const useProgress = createGlobalState({ value: 0, running: false, rateMs: 100 } as ProgressState, {
  name: 'progress',
  actions: {
    tick() {
      return ({ setState }) => {
        setState((state) => ({ ...state, value: state.value >= 100 ? 0 : state.value + 1 }));
      };
    },
    start() {
      return ({ setState }) => {
        setState((state) => ({ ...state, running: true }));
      };
    },
    stop() {
      return ({ setState }) => {
        setState((state) => ({ ...state, running: false }));
      };
    },
    setRate(rateMs: number) {
      return ({ setState }) => {
        setState((state) => ({ ...state, rateMs }));
      };
    },
    reset() {
      return ({ setState }) => {
        setState((state) => ({ ...state, value: 0 }));
      };
    },
  },
});
