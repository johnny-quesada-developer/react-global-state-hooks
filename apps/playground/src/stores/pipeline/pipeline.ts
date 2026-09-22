import { createGlobalState } from 'react-hooks-global-states';

export type PipelineStage =
  'idle' | 'validating' | 'uploading' | 'processing' | 'finalizing' | 'done' | 'failed';

export type PipelineState = {
  stage: PipelineStage;
  /** 0..100 progress accumulated across the multi-stage action. */
  progress: number;
  /** Human-readable log of every intermediate state transition. */
  steps: string[];
  lastError: string | null;
};

const initialState: PipelineState = {
  stage: 'idle',
  progress: 0,
  steps: [],
  lastError: null,
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Store dedicated to demonstrating actions that mutate the store multiple times
 * during a single action lifecycle. Every action pushes several `setState`
 * calls, and the async ones interleave `setState` with `await` boundaries
 * (setState → await → setState → await → setState). This makes the DevTools
 * panel show a whole sequence of intermediate transitions per action instead of
 * a single before/after diff.
 */
export const usePipeline = createGlobalState(initialState, {
  name: 'pipeline',
  actions: {
    /**
     * Synchronous multi-stage action: several `setState` calls fire back to back
     * within the same tick, with no awaiting in between.
     */
    runSync() {
      return ({ setState }) => {
        setState(() => ({
          stage: 'validating',
          progress: 10,
          steps: ['sync: validating'],
          lastError: null,
        }));

        setState((s) => ({
          ...s,
          stage: 'processing',
          progress: 55,
          steps: [...s.steps, 'sync: processing'],
        }));

        setState((s) => ({
          ...s,
          stage: 'done',
          progress: 100,
          steps: [...s.steps, 'sync: done'],
        }));
      };
    },

    /**
     * Asynchronous multi-stage action with the requested shape:
     * setState → await → setState → await → setState → await → setState.
     * Each stage advances the progress bar so the intermediate updates are
     * clearly visible while the action is still in flight.
     */
    runAsync() {
      return async ({ setState }) => {
        // Stage 1 — validating
        setState(() => ({
          stage: 'validating',
          progress: 15,
          steps: ['async: validating'],
          lastError: null,
        }));
        await wait(500);

        // Stage 2 — uploading
        setState((s) => ({
          ...s,
          stage: 'uploading',
          progress: 45,
          steps: [...s.steps, 'async: uploading'],
        }));
        await wait(500);

        // Stage 3 — processing
        setState((s) => ({
          ...s,
          stage: 'processing',
          progress: 75,
          steps: [...s.steps, 'async: processing'],
        }));
        await wait(500);

        // Stage 4 — finalizing then done
        setState((s) => ({
          ...s,
          stage: 'finalizing',
          progress: 90,
          steps: [...s.steps, 'async: finalizing'],
        }));
        await wait(400);

        setState((s) => ({
          ...s,
          stage: 'done',
          progress: 100,
          steps: [...s.steps, 'async: done'],
        }));

        return { success: true as const };
      };
    },

    /**
     * Async action that mutates state several times and then fails partway,
     * writing an error on a later stage. Demonstrates intermediate updates
     * followed by an error path within a single action.
     */
    runAsyncFailing() {
      return async ({ setState, getState }) => {
        setState(() => ({
          stage: 'validating',
          progress: 20,
          steps: ['async-fail: validating'],
          lastError: null,
        }));
        await wait(500);

        setState((s) => ({
          ...s,
          stage: 'uploading',
          progress: 60,
          steps: [...s.steps, 'async-fail: uploading'],
        }));
        await wait(500);

        // Read the latest state, then transition into a failure.
        const current = getState();
        setState((s) => ({
          ...s,
          stage: 'failed',
          progress: current.progress,
          steps: [...s.steps, 'async-fail: failed'],
          lastError: 'Upload rejected by server',
        }));

        return { success: false as const, error: 'Upload rejected by server' };
      };
    },

    reset() {
      return ({ setState }) => {
        setState(() => ({ ...initialState }));
      };
    },
  },
});
