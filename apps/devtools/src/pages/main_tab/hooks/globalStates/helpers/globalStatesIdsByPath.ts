import { EntityAdapter } from '@src/shared/tools/EntityAdapter';
import type { GlobalStateMetaExtended } from './useGlobalStates.types';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';
import isNil from 'json-storage-formatter/isNil';

/**
 * Index of the live store ids that were created at each creation path.
 *
 * A single path can own MULTIPLE store instances: the same `createContext`/`createGlobalState`
 * call site produces the same deterministic path, and it can be instantiated more than once
 * (e.g. several mounted context providers, or a user store deliberately created per instance).
 * So this is `path -> ordered array of ids`, not a 1:1 map.
 *
 * Note: this is distinct from fast-refresh / StrictMode double-invocation, which is deduped
 * upstream (a re-created store at the same path reuses cleanup via maybeCleanupPreviousStateMetadata
 * on the page side). Here we only ever track genuinely-live instances.
 */
const idsByPath = new Map<string, GlobalStateId[]>();

/** Append an id to its path's instance list (creation order preserved). */
export const addGlobalStateToPath = (globalStatePath: string, globalStateId: GlobalStateId) => {
  const ids = idsByPath.get(globalStatePath);

  if (!ids) {
    idsByPath.set(globalStatePath, [globalStateId]);
    return;
  }

  // Guard against accidental duplicates (same id announced twice).
  if (!ids.includes(globalStateId)) ids.push(globalStateId);
};

/** All live ids currently registered for a path, in creation order. */
export const getGlobalStateIdsOfPath = (globalStatePath: string): GlobalStateId[] => {
  return idsByPath.get(globalStatePath) ?? [];
};

/** Drop the entire index. Used when the whole set of states is replaced (loadMockState). */
export const clearGlobalStatePaths = () => {
  idsByPath.clear();
};

/**
 * Remove a SINGLE instance id from its path. The path entry is dropped only once it has no
 * remaining instances. Used when one store instance unmounts (DELETE_GLOBAL_STATE).
 */
export const removeGlobalStateIdFromPath = (globalStatePath: string, globalStateId: GlobalStateId) => {
  const ids = idsByPath.get(globalStatePath);
  if (!ids) return;

  const next = ids.filter((id) => id !== globalStateId);

  if (next.length) {
    idsByPath.set(globalStatePath, next);
  } else {
    idsByPath.delete(globalStatePath);
  }
};

/**
 * Remove every store that belongs to a path (all instances) from the given adapter and drop the
 * path from the index. `'*'` clears everything. Used on page reload / clear (CLEAR_GLOBAL_STATES).
 */
export const removeGlobalStatesOfPath = (
  globalStatePath: string,
  state: EntityAdapter<GlobalStateId, GlobalStateMetaExtended>,
): EntityAdapter<GlobalStateId, GlobalStateMetaExtended> => {
  const isDeleteAll = globalStatePath === '*';
  if (isDeleteAll) {
    // starts from scratch
    idsByPath.clear();
    return new EntityAdapter();
  }

  const ids = idsByPath.get(globalStatePath);
  if (isNil(ids) || !ids.length) return state;

  for (const globalStateId of ids) state.delete(globalStateId);
  idsByPath.delete(globalStatePath);

  return new EntityAdapter(state);
};
