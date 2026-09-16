import { createGlobalState } from 'react-global-state-hooks/createGlobalState';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';

/**
 * Per-state "unseen actions" tracking.
 *
 * We count ACTIONS, not individual logs: one action can emit many logs (e.g. an async action or a
 * progress loop), and "3 new actions" is both fewer updates and easier to understand than a raw log
 * count. `total` is a monotonic count of every action recorded for a state. `seen` is the total
 * captured the last time the user viewed (selected) that state. Unseen = total - seen.
 *
 * IMPORTANT: consumed imperatively (no React hook) by the UnseenBadge, which updates its own DOM
 * node via a ref, so a fast-updating state never drives re-renders across the whole state list.
 */
type CountByStateId = Record<string, number>;

const totalActionCountByStateId$ = createGlobalState({} as CountByStateId, { name: 'totalActionCountByStateId' });
const seenActionCountByStateId$ = createGlobalState({} as CountByStateId, { name: 'seenActionCountByStateId' });

// Two DISTINCT listener sets to avoid a feedback loop:
//  - unseenListeners: notified whenever the unseen count for a state changes (total OR seen). Used
//    by the UnseenBadge to repaint. These listeners must NOT mutate counts.
//  - actionArrivalListeners: notified ONLY when a new action actually arrives (total increments),
//    NOT when a state is marked seen. Used by the selection logic to keep the viewed state's seen
//    mark current. Keeping this separate prevents markStateSeen -> notify -> markStateSeen loops.
const unseenListeners = new Set<(globalStateId: GlobalStateId) => void>();
const actionArrivalListeners = new Set<(globalStateId: GlobalStateId) => void>();

/** Increment a state's monotonic total action count. Called once per action from the reducers. */
export const incrementActionCount = (globalStateId: GlobalStateId, amount: number) => {
  if (amount <= 0) return;

  totalActionCountByStateId$.setState((counts) => ({
    ...counts,
    [globalStateId]: (counts[globalStateId] ?? 0) + amount,
  }));

  actionArrivalListeners.forEach((listener) => listener(globalStateId));
  unseenListeners.forEach((listener) => listener(globalStateId));
};

/** Mark a state as seen: its unseen count drops to 0 by capturing the current total. */
export const markStateSeen = (globalStateId: GlobalStateId) => {
  const total = totalActionCountByStateId$.getState()[globalStateId] ?? 0;
  const previousSeen = seenActionCountByStateId$.getState()[globalStateId] ?? 0;
  if (previousSeen === total) return; // nothing changed; avoids redundant notifications

  seenActionCountByStateId$.setState((seen) => ({
    ...seen,
    [globalStateId]: total,
  }));

  // Only the badge listeners, NOT the action-arrival listeners (which would re-trigger markStateSeen).
  unseenListeners.forEach((listener) => listener(globalStateId));
};

/** Drop tracking for states that no longer exist (removed / cleared). */
export const forgetStates = (globalStateIds: GlobalStateId[]) => {
  if (!globalStateIds.length) return;

  const drop = (counts: CountByStateId): CountByStateId => {
    const next = { ...counts };
    for (const id of globalStateIds) delete next[id];
    return next;
  };

  totalActionCountByStateId$.setState(drop);
  seenActionCountByStateId$.setState(drop);
};

/** Current unseen-action count for a single state (imperative read, no subscription). */
export const getUnseenCount = (globalStateId: GlobalStateId): number => {
  const total = totalActionCountByStateId$.getState()[globalStateId] ?? 0;
  const seen = seenActionCountByStateId$.getState()[globalStateId] ?? 0;
  return Math.max(0, total - seen);
};

/**
 * Imperatively subscribe to the unseen count of ONE state. Fires when that state's total or seen
 * count changes. Returns an unsubscribe. No React re-render involved.
 */
export const subscribeToUnseenCount = (globalStateId: GlobalStateId, callback: (count: number) => void) => {
  const listener = (changedId: GlobalStateId) => {
    if (changedId === globalStateId) callback(getUnseenCount(globalStateId));
  };

  unseenListeners.add(listener);
  return () => {
    unseenListeners.delete(listener);
  };
};

/**
 * Subscribe to per-state action arrivals (any state). The callback receives the id that changed, so
 * a consumer can decide whether it's the one currently being viewed. Used to keep the selected
 * state's seen mark current.
 */
export const subscribeToActionArrivals = (callback: (globalStateId: GlobalStateId) => void) => {
  actionArrivalListeners.add(callback);
  return () => {
    actionArrivalListeners.delete(callback);
  };
};
