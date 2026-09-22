import {
  getStateSnapshot,
  loadReconciledSnapshot,
  type ReconnectedStore,
} from '@main_tab/hooks/globalStates/helpers/loadMockState';
import globalStates$ from '@main_tab/hooks/globalStates/globalStates';
import loadMismatch$, { type LoadMismatch } from '@main_tab/hooks/loadMismatch';
import {
  evaluateSnapshotAgainstLive,
  type SnapshotStoreRef,
} from '@main_tab/hooks/globalStates/helpers/evaluateConnectionOutcome';
import { normalizeStatePath } from '@main_tab/hooks/globalStates/helpers/normalizeStatePath';
import { getContentScriptPort } from './getContentScriptPort';
import { uniqueId } from 'react-global-state-hooks/uniqueId';
import { tryCatch } from 'easy-cancelable-promise/tryCatch';
import { downloadFile, fileTimestamp } from '@src/shared/tools/downloadFile';

/**
 * Download a single JSON file with a full snapshot of everything the DevTools currently holds
 * (all stores, their current state, actions and logs).
 *
 * The snapshot uses the exact same shape as the mock examples (getStateSnapshot), and values stay
 * in the `$t`/`$v` encoded form the DevTools already stores them in — no re-encoding — so the file
 * can be loaded straight back via loadMockState with 100% fidelity.
 */
export const downloadGlobalStatesSnapshot = (): void => {
  const snapshot = getStateSnapshot();
  downloadFile(JSON.stringify(snapshot, null, 2), `global-states-snapshot-${fileTimestamp()}.json`);
};

/** The stores a snapshot file describes, reduced to what path-matching needs (name + path). */
const readSnapshotStores = (data: unknown): SnapshotStoreRef[] => {
  const raw = data as {
    ids?: string[];
    entities?: Record<string, { name?: string; globalStatePath?: string }>;
  };
  const ids = raw?.ids ?? [];
  const entities = raw?.entities ?? {};

  return ids.map((id) => {
    const entity = entities[id] ?? {};
    return {
      name: entity.name ?? id,
      // Normalize so paths match the live ones regardless of the Vite optimizer hash they were
      // exported under.
      globalStatePath: normalizeStatePath(entity.globalStatePath ?? ''),
    };
  });
};

/**
 * How many live instances the panel currently mirrors at each creation path (excludes entries from
 * an earlier loaded snapshot). Counts, not just presence, because stores are multi-instance and
 * reconnection pairs instances one-for-one per path.
 */
const getLiveCountByPath = (): Map<string, number> => {
  const countByPath = new Map<string, number>();
  for (const meta of globalStates$.getState().values()) {
    countByPath.set(meta.globalStatePath, (countByPath.get(meta.globalStatePath) ?? 0) + 1);
  }
  return countByPath;
};

/**
 * Read a snapshot/mock JSON file and load it into the DevTools, replacing the current states.
 * Accepts the same format produced by downloadGlobalStatesSnapshot / the mock examples.
 *
 * Because the panel is a live mirror of the page, we can tell up front — before loading — whether
 * the snapshot's stores will connect: a store connects only if the running app already has one at
 * the same globalStatePath. We compare against those live paths (per-path counts, since stores are
 * multi-instance) and surface a report on mismatch, then load — loadReconciledSnapshot pairs each
 * loaded instance to a live one and discards anything with no live counterpart.
 */
/**
 * Push each reconnected store's snapshot state down to its live store on the page, so loading a
 * snapshot actually RESTORES the app state (not just the panel view). Mirrors the manual-edit path
 * (StateViewer): a `RESTORE_STATE` request the page decodes (formatFromStore) and merges. The state
 * stays in the `$t`/`$v` encoded form the page expects — no re-encoding here.
 */
const restoreOnPage = (reconnected: ReconnectedStore[]): void => {
  if (!reconnected.length) return;

  tryCatch(() => {
    const port = getContentScriptPort();
    if (!port) return;

    for (const { globalStateId, state } of reconnected) {
      port.postMessage({
        action: 'devtools-request/RESTORE_STATE',
        id: uniqueId('devtools-request:'),
        timestamp: performance.now(),
        payload: { actionName: 'setState', globalStateId, state },
      });
    }
  });
};

export const loadGlobalStatesFromFile = async (file: File): Promise<void> => {
  const text = await file.text();
  const data = JSON.parse(text);

  // Path-level check against the live mirror (which stores were skipped for lack of a live store).
  const pathOutcome = evaluateSnapshotAgainstLive(readSnapshotStores(data), getLiveCountByPath());

  // Reconcile: pair by path, then push restorable state down and learn which connected stores had
  // a wholly non-serializable state (nothing to restore).
  const { reconnected, notRestorable } = loadReconciledSnapshot(data);
  restoreOnPage(reconnected);

  reportLoadOutcome(pathOutcome, notRestorable);
};

/**
 * Combine the path-level mismatch (skipped stores) with the reconcile-level result (stores that
 * connected but whose whole state couldn't be restored) into a single modal report. Reports null
 * (dismiss) only when everything connected AND everything was restorable.
 */
const reportLoadOutcome = (pathOutcome: LoadMismatch | null, notRestorable: string[]): void => {
  if (!pathOutcome && !notRestorable.length) {
    loadMismatch$.actions.dismiss();
    return;
  }

  if (pathOutcome) {
    // Fold the not-restorable stores into the existing report. Kind stays as-is: 'no-live-page'
    // means nothing connected at all, which already dominates.
    loadMismatch$.actions.report({ ...pathOutcome, notRestorable });
    return;
  }

  // All paths connected, but some stores had nothing serializable to restore.
  loadMismatch$.actions.report({
    kind: 'partial',
    connected: [],
    unconnected: [],
    notRestorable,
  });
};

/**
 * Open a file picker and load the chosen JSON snapshot into the DevTools.
 */
export const promptLoadGlobalStatesFromFile = (): void => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;

    void loadGlobalStatesFromFile(file).catch((error) => {
      console.error('[devtools] failed to load states from file', error);
    });
  });

  input.click();
};
