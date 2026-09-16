import { createGlobalState } from 'react-global-state-hooks/createGlobalState';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';

/**
 * Per-state "unseen actions" pill.
 *
 * We DERIVE the count from the existing source of truth — the actions-by-state store, which maps
 * each state to its Set of actionIds and only grows as actions arrive. We do NOT maintain a
 * parallel counter. The only thing we store is a per-state "seen" baseline: the action count
 * captured the last time the user viewed that state.
 *
 *   unseen(state) = currentActionCount(state) - seenBaseline(state)
 *
 * So it doesn't matter what number a state has when we first baseline it; from then on every growth
 * of the action count is naturally +1 unseen until the user looks again.
 *
 * The source store is INJECTED (registerActionCountSource) rather than imported, to avoid a
 * circular import with globalStates.ts (which imports this module).
 *
 * Consumed imperatively (no React hook) by the UnseenBadge, which updates its own DOM node via a
 * ref, so a fast-updating state never drives re-renders across the whole state list.
 */
type CountByStateId = Record<string, number>;

/** Minimal shape of the actions-by-state store this module needs. */
export type ActionCountSource = {
  getState: () => { get: (id: GlobalStateId) => { size: number } | undefined; entries: () => Iterable<[GlobalStateId, { size: number } | undefined]> };
  subscribe: (
    selector: (state: any) => unknown,
    callback: (value: unknown) => void,
    options?: { skipFirst?: boolean }
  ) => () => void;
};

let actionCountSource: ActionCountSource | null = null;

/** Wire the actions-by-state store as the source of truth (called once from globalStates.ts). */
export const registerActionCountSource = (source: ActionCountSource) => {
  actionCountSource = source;
};

const seenActionCountByStateId$ = createGlobalState({} as CountByStateId, { name: 'seenActionCountByStateId' });

/** Current number of actions recorded for a state (from the injected source). */
const getActionCount = (globalStateId: GlobalStateId): number => {
  return actionCountSource?.getState().get(globalStateId)?.size ?? 0;
};

/** Current unseen-action count for a single state. */
export const getUnseenCount = (globalStateId: GlobalStateId): number => {
  const total = getActionCount(globalStateId);
  const seen = seenActionCountByStateId$.getState()[globalStateId] ?? 0;
  return Math.max(0, total - seen);
};

/** Mark a state as seen: its unseen count drops to 0 by baselining to the current action count. */
export const markStateSeen = (globalStateId: GlobalStateId) => {
  const total = getActionCount(globalStateId);
  const previousSeen = seenActionCountByStateId$.getState()[globalStateId] ?? 0;
  if (previousSeen === total) return;

  seenActionCountByStateId$.setState((seen) => ({
    ...seen,
    [globalStateId]: total,
  }));
};

/** Drop tracking for states that no longer exist (removed / cleared). */
export const forgetStates = (globalStateIds: GlobalStateId[]) => {
  if (!globalStateIds.length) return;

  seenActionCountByStateId$.setState((seen) => {
    const next = { ...seen };
    for (const id of globalStateIds) delete next[id];
    return next;
  });
};

/**
 * Imperatively subscribe to the unseen count of ONE state. Fires whenever that state's action count
 * or its seen baseline changes. Returns an unsubscribe. No React render.
 */
export const subscribeToUnseenCount = (globalStateId: GlobalStateId, callback: (count: number) => void) => {
  const notify = () => callback(getUnseenCount(globalStateId));

  const unsubscribeActions =
    actionCountSource?.subscribe(
      (state: any) => state.get(globalStateId)?.size ?? 0,
      () => notify(),
      { skipFirst: true }
    ) ?? (() => {});

  const unsubscribeSeen = seenActionCountByStateId$.subscribe(
    (seen) => seen[globalStateId] ?? 0,
    () => notify(),
    { skipFirst: true }
  );

  return () => {
    unsubscribeActions();
    unsubscribeSeen();
  };
};

/**
 * Subscribe to action arrivals for any state (used by the selection logic to keep the viewed
 * state's baseline current). Fires with the id whose action count changed.
 */
export const subscribeToActionArrivals = (callback: (globalStateId: GlobalStateId) => void) => {
  if (!actionCountSource) return () => {};

  const previousSizes = new Map<GlobalStateId, number>();

  return actionCountSource.subscribe(
    (state: any) => state,
    (state: any) => {
      for (const [id, actionIds] of state.entries()) {
        const size = actionIds?.size ?? 0;
        if (previousSizes.get(id) !== size) {
          previousSizes.set(id, size);
          callback(id);
        }
      }
    }
  );
};
