import { getStateSnapshot } from '@main_tab/hooks/globalStates/helpers/loadMockState';
import { loadMockState } from '@main_tab/hooks/globalStates/helpers/loadMockState';

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

/**
 * Read a snapshot/mock JSON file and load it into the DevTools, replacing the current states.
 * Accepts the same format produced by downloadGlobalStatesSnapshot / the mock examples.
 */
export const loadGlobalStatesFromFile = async (file: File): Promise<void> => {
  const text = await file.text();
  const data = JSON.parse(text);
  loadMockState(data);
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
