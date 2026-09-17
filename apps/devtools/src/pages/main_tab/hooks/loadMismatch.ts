import { createGlobalState } from 'react-global-state-hooks/createGlobalState';

/**
 * Outcome of loading a JSON snapshot against the live page.
 *
 * A snapshot store connects only if the running app has a live store at the same `globalStatePath`.
 * Stores are multi-instance, so pairing is per-path and index-aligned; any loaded instance with no
 * live counterpart is discarded (we cannot replace what does not exist). This state carries enough
 * detail to explain what was skipped to the user in plain language.
 */
export type LoadMismatch = {
  /**
   * - 'no-live-page': none of the snapshot's paths match a live store, so nothing could be
   *   restored (the app isn't running in this tab, or nothing is mounted at those paths).
   * - 'partial': some stores matched and were restored; the rest had no matching live store and
   *   were skipped.
   */
  kind: 'no-live-page' | 'partial';

  /** Human-readable names of snapshot stores that connected to a live store. */
  connected: string[];

  /** Human-readable names of snapshot stores that were skipped (no live store to pair with). */
  unconnected: string[];
};

/**
 * Holds the current load-mismatch report, or null when there is nothing to show.
 * The LoadMismatchModal subscribes to this; setting it opens the modal, clearing it closes it.
 */
export const loadMismatch$ = createGlobalState(null as LoadMismatch | null, {
  name: 'loadMismatch',
  actions: {
    report: (mismatch: LoadMismatch) => {
      return ({ setState }: { setState: (value: LoadMismatch | null) => void }) => setState(mismatch);
    },
    dismiss: () => {
      return ({ setState }: { setState: (value: LoadMismatch | null) => void }) => setState(null);
    },
  },
});

export default loadMismatch$;
