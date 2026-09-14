import { createGlobalState } from 'react-global-state-hooks/createGlobalState';
import globalStates$ from './globalStates/globalStates';
import isNil from 'json-storage-formatter/isNil';
import { isNonNullable } from '@src/shared/asserts';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';
import { getOrderedGlobalStates } from './globalStates/helpers/getOrderedGlobalStates';

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

export const useIsSelectedState = (key: GlobalStateId) => {
  return selectedGlobalStateId$((state) => state === key, {
    dependencies: [key],
  });
};

export default selectedGlobalStateId$;
