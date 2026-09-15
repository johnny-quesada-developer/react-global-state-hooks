import { mapGroupedToHeaders } from '@src/pages/main_tab/hooks/globalStates/hooks/useActionsHeaders';
import selectedGlobalStateId$ from '@src/pages/main_tab/hooks/selectedGlobalStateId';
import isNil from 'json-storage-formatter/isNil';
import { createGlobalState } from 'react-global-state-hooks/createGlobalState';
import type { ActionId } from '@src/shared/schema/ActionJson';
import { buildGroupedActionLogs } from '@src/pages/main_tab/hooks/globalStates/helpers/buildGroupedActionLogs';

export const selectedActionHeader$ = createGlobalState(null as ActionId | null, {
  name: 'selectedHeader',
  callbacks: {
    onInit: ({ setState }) => {
      selectedGlobalStateId$.subscribe(
        (stateId) => {
          if (isNil(stateId)) return setState(null);

          const grouped = buildGroupedActionLogs(stateId);

          const headers = mapGroupedToHeaders(grouped);
          const lastAction = headers[headers.length - 1];

          setState(lastAction?.actionId ?? null);
        },
        {
          skipFirst: true,
        }
      );
    },
  },
});

export const useIsSelectedHeader = (actionId: ActionId) => {
  return selectedActionHeader$((selectedHeader) => selectedHeader === actionId, {
    dependencies: [actionId],
  });
};
