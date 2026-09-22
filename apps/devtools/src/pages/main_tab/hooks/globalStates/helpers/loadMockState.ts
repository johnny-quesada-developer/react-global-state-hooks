import { EntityAdapter } from '@src/shared/tools/EntityAdapter';
import { AdaptiveEntityAdapter } from '@src/shared/tools/AdaptiveEntityAdapter';
import type { GlobalStateMetaExtended } from './useGlobalStates.types';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';
import globalStates$, {
  actionsById$,
  actionIdsByStateId$,
  actionKeysByStateId$,
  syncActionToStores,
} from '../globalStates';
import { addGlobalStateToPath, clearGlobalStatePaths } from './globalStatesIdsByPath';
import { normalizeStatePath } from './normalizeStatePath';
import isRecord from 'react-global-state-hooks/isRecord';

type RawMockState = {
  entities: Record<string, any>;
  ids: string[];
};

/** A store to insert into the panel: the id it lives under, its meta fields, and its actions. */
type StateEntry = {
  stateId: GlobalStateId;
  globalStatePath: string;
  stateFields: Record<string, any>;
  actions: any[];
};

/**
 * Replace the panel's entire store set with `entries`, rebuilding globalStates$, the action stores
 * and the path index from scratch. Shared low-level insert used by both the verbatim mock loader
 * and the reconciling snapshot loader.
 */
function replaceAllStates(entries: StateEntry[]) {
  const globalStatesAdapter = new EntityAdapter<any, GlobalStateMetaExtended>({});

  actionsById$.setState(new AdaptiveEntityAdapter({}));
  actionIdsByStateId$.setState(new EntityAdapter({}));
  actionKeysByStateId$.setState(new EntityAdapter({}));
  // Replacing the whole set of states: drop any previously indexed paths so a re-load starts the
  // path -> ids index from scratch.
  clearGlobalStatePaths();

  for (const { stateId, globalStatePath, stateFields, actions } of entries) {
    const stateMeta: GlobalStateMetaExtended = {
      globalStatePath: '',
      ...stateFields,
      globalStateId: stateId,
    } as GlobalStateMetaExtended;

    globalStatesAdapter.add(stateId, stateMeta);
    addGlobalStateToPath(globalStatePath, stateId);

    for (const action of actions) syncActionToStores(action);
  }

  globalStates$.setState(globalStatesAdapter);
}

/** Pull the meta fields + actions out of a raw snapshot entity (shape from getStateSnapshot). */
const readRawEntity = (entity: any) => {
  const { groupedByActionStateLogs, hooks: _hooks, ...stateFields } = entity;
  const actions: any[] = (groupedByActionStateLogs?.ids ?? []).map(
    (actionId: string) => groupedByActionStateLogs.entities[actionId],
  );
  return { stateFields, actions };
};

/**
 * Load a snapshot/mock verbatim: every store keeps its own id and is inserted as-is. Used to seed
 * the panel from the bundled mock examples / dev preview, where there is no live page to reconcile
 * against.
 */
export function loadMockState(mockData: unknown) {
  const raw = mockData as RawMockState;

  const entries: StateEntry[] = raw.ids.map((stateId) => {
    const { stateFields, actions } = readRawEntity(raw.entities[stateId]);
    return {
      stateId: stateId as GlobalStateId,
      globalStatePath: stateFields.globalStatePath ?? '',
      stateFields,
      actions,
    };
  });

  replaceAllStates(entries);
}

/**
 * The live stores the panel currently mirrors, grouped by creation path in announcement order:
 * `path -> [liveId, liveId, ...]`.
 *
 * Stores are inherently multi-instance (the same createGlobalState/createContext call site can be
 * mounted many times) and all share one `globalStatePath` (it is derived from the creation stack).
 */
const captureLivePathIds = (): Map<string, GlobalStateId[]> => {
  const liveIdsByPath = new Map<string, GlobalStateId[]>();

  for (const meta of globalStates$.getState().values()) {
    const ids = liveIdsByPath.get(meta.globalStatePath);
    if (ids) ids.push(meta.globalStateId);
    else liveIdsByPath.set(meta.globalStatePath, [meta.globalStateId]);
  }

  return liveIdsByPath;
};

/**
 * Load a snapshot and reconnect it to the live page the panel is mirroring. Used by the file-upload
 * flow, where the panel already holds the running app's stores.
 *
 * Reconnection is per-path and index-aligned: the i-th loaded instance at a path adopts the i-th
 * live instance's id (a[i] = b[i]), keeping the snapshot's state and logs but routing edits/actions
 * to the real store. A loaded instance with no live counterpart is discarded — we cannot replace
 * what does not exist, and keeping a store under a dead id would only crash on interaction.
 */
/** A store that was reconnected to a live id, plus the snapshot state to push back to the page. */
export type ReconnectedStore = {
  globalStateId: GlobalStateId;
  /** The snapshot's saved state, in the `$t`/`$v` encoded form the page's RESTORE_STATE decodes. */
  state: unknown;
};

export type ReconcileResult = {
  /** Stores connected to a live id whose state CAN be pushed to the page. */
  reconnected: ReconnectedStore[];
  /**
   * Names of stores that connected by path but whose ENTIRE saved state is non-serializable (a
   * top-level `__non_serializable__` marker). There is nothing serializable to push, so they are
   * loaded into the panel view but not restored on the page — surfaced to the user.
   */
  notRestorable: string[];
};

/** True when the value is a bare non-serializable placeholder (its whole content is unrepresentable). */
const isWhollyNonSerializable = (value: unknown): boolean =>
  isRecord(value) && '__non_serializable__' in (value as Record<string, unknown>);

export function loadReconciledSnapshot(snapshotData: unknown): ReconcileResult {
  const raw = snapshotData as RawMockState;

  // Capture the live mirror BEFORE we tear it down.
  const liveIdsByPath = captureLivePathIds();
  const consumedByPath = new Map<string, number>();

  const entries: StateEntry[] = [];
  const reconnected: ReconnectedStore[] = [];
  const notRestorable: string[] = [];

  for (const loadedStateId of raw.ids) {
    const { stateFields, actions } = readRawEntity(raw.entities[loadedStateId]);
    // Normalize so a snapshot exported under a different Vite optimizer hash still matches the live
    // path (which ADD_GLOBAL_STATE also normalizes).
    const globalStatePath: string = normalizeStatePath(stateFields.globalStatePath ?? '');

    const liveIds = liveIdsByPath.get(globalStatePath) ?? [];
    const consumed = consumedByPath.get(globalStatePath) ?? 0;
    const liveId = liveIds[consumed];
    consumedByPath.set(globalStatePath, consumed + 1);

    // No live instance left at this path => discard this loaded instance.
    if (liveId == null) continue;

    entries.push({
      stateId: liveId,
      globalStatePath,
      stateFields,
      // Re-key each action + its logs to the live id so the Logs/Actions tabs resolve correctly.
      actions: actions.map((action) => ({
        ...action,
        globalStateId: liveId,
        logs: (action.logs ?? []).map((log: any) => ({ ...log, globalStateId: liveId })),
      })),
    });

    // If the whole state is non-serializable there is nothing to push down; keep it in the panel
    // view but report it as not restorable. Otherwise remember it to RESTORE on the page.
    if (isWhollyNonSerializable(stateFields.currentState)) {
      notRestorable.push(stateFields.name ?? String(loadedStateId));
    } else {
      reconnected.push({ globalStateId: liveId, state: stateFields.currentState });
    }
  }

  replaceAllStates(entries);

  return { reconnected, notRestorable };
}

export function getStateSnapshot() {
  const globalStates = globalStates$.getState();
  const actionsById = actionsById$.getState();
  const actionIdsByStateId = actionIdsByStateId$.getState();
  const actionKeysByStateId = actionKeysByStateId$.getState();

  const result: Record<string, any> = {
    entities: {} as Record<string, any>,
    ids: globalStates.ids as string[],
  };

  for (const stateId of globalStates.ids) {
    const stateMeta = globalStates.entities[stateId as keyof typeof globalStates.entities];
    const stateActions: Record<string, any> = {};
    const stateActionIds: string[] = [];

    const actionIds = actionIdsByStateId.entities[stateId as keyof typeof actionIdsByStateId.entities];
    for (const actionId of actionIds ?? []) {
      const action = actionsById.entities[actionId as keyof typeof actionsById.entities];
      if (!action) continue;

      stateActions[actionId] = action;
      stateActionIds.push(actionId);
    }

    result.entities[stateId] = {
      ...stateMeta,
      groupedByActionStateLogs: {
        entities: stateActions,
        ids: stateActionIds,
      },
    };
  }

  const actionKeysEntities: Record<string, Record<string, string[]>> = {};
  for (const stateId of actionKeysByStateId.ids) {
    const keysByActionKey =
      actionKeysByStateId.entities[stateId as keyof typeof actionKeysByStateId.entities];
    if (!keysByActionKey) continue;
    actionKeysEntities[stateId as string] = Object.fromEntries(keysByActionKey);
  }

  result._actionKeysByStateId = {
    entities: actionKeysEntities,
    ids: actionKeysByStateId.ids,
  };

  return result;
}
