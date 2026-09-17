import { getStateSnapshot, loadReconciledSnapshot } from '@main_tab/hooks/globalStates/helpers/loadMockState';
import globalStates$ from '@main_tab/hooks/globalStates/globalStates';
import loadMismatch$ from '@main_tab/hooks/loadMismatch';
import {
  evaluateSnapshotAgainstLive,
  type SnapshotStoreRef,
} from '@main_tab/hooks/globalStates/helpers/evaluateConnectionOutcome';
import { normalizeStatePath } from '@main_tab/hooks/globalStates/helpers/normalizeStatePath';

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
  const json = JSON.stringify(snapshot, null, 2);

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `global-states-snapshot-${stamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
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
export const loadGlobalStatesFromFile = async (file: File): Promise<void> => {
  const text = await file.text();
  const data = JSON.parse(text);

  // Validate against what the panel already mirrors, before replacing anything.
  const outcome = evaluateSnapshotAgainstLive(readSnapshotStores(data), getLiveCountByPath());
  if (outcome) loadMismatch$.actions.report(outcome);
  else loadMismatch$.actions.dismiss();

  loadReconciledSnapshot(data);
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
