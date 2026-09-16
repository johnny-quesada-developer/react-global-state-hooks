import { createGlobalState } from 'react-global-state-hooks/createGlobalState';
import globalStates$ from './globalStates/globalStates';
import isNil from 'json-storage-formatter/isNil';
import { isNonNullable } from '@src/shared/asserts';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';
import { getOrderedGlobalStates } from './globalStates/helpers/getOrderedGlobalStates';
import { markStateSeen, subscribeToActionArrivals } from './unseenLogs';

const selectedGlobalStateId$ = createGlobalState(null as GlobalStateId | null, {
  name: 'selectedStateId',
  metadata: {
    sort: 0,
  },
  callbacks: {
    onInit: ({ setState, getState }) => {
      let autoSelectedId: GlobalStateId | null = null;

      globalStates$.subscribe((state) => {
        if (!state.length) {
          autoSelectedId = null;
          setState(null);
          return;
        }

        const current = getState();
        const isUserSelection = isNonNullable(current) && current !== autoSelectedId;
        if (isUserSelection) return;

        const orderedFirstId = getOrderedGlobalStates(state)[0]?.globalStateId;
        if (isNil(orderedFirstId) || orderedFirstId === current) return;

        autoSelectedId = orderedFirstId;
        setState(orderedFirstId);
      });
    },
  },
});

// Viewing a state marks it seen (unseen count -> 0). Covers both user clicks/keyboard and the
// auto-selection above.
//
// Deferred + guarded: during load, states stream in and the auto-selection can transiently point at
// several "first" states before settling. Marking seen synchronously would clear the badge of every
// transiently-selected state. Deferring to a microtask and re-checking that the id is STILL selected
// means only the FINAL settled selection is marked seen.
selectedGlobalStateId$.subscribe((selectedId) => {
  if (isNil(selectedId)) return;

  queueMicrotask(() => {
    if (selectedGlobalStateId$.getState() === selectedId) markStateSeen(selectedId);
  });
});

// Actions arriving for the state you're currently viewing shouldn't show as unseen: keep ONLY the
// selected state's seen mark current. Actions for any other state must stay unseen. Deferred +
// guarded like the selection handler so transient load-time selections don't wrongly clear badges.
subscribeToActionArrivals((changedId) => {
  queueMicrotask(() => {
    if (changedId === selectedGlobalStateId$.getState()) markStateSeen(changedId);
  });
});

export const useIsSelectedState = (key: GlobalStateId) => {
  return selectedGlobalStateId$((state) => state === key, {
    dependencies: [key],
  });
};

export default selectedGlobalStateId$;
