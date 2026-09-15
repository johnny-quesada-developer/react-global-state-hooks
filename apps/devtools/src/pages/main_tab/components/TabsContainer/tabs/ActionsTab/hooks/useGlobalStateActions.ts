import useStateMeta from '@src/pages/main_tab/hooks/globalStates/hooks/useStateMeta';
import selectedGlobalStateId$ from '@src/pages/main_tab/hooks/selectedGlobalStateId';
import { shallowCompare } from 'react-global-state-hooks/shallowCompare';
import { buildActionPerActionKey } from '@src/pages/main_tab/hooks/globalStates/helpers/buildActionPerActionKey';

export const useGlobalStateActions = () => {
  const [globalStateId] = selectedGlobalStateId$();

  return useStateMeta(
    globalStateId,
    (state) => {
      const actionPerActionKey = globalStateId ? buildActionPerActionKey(globalStateId) : null;

      const actions = Object.entries(state?.actions ?? {}).reduce<
        Record<
          string,
          {
            length: number;
            callCount: number;
          }
        >
      >((acc, [key, value]) => {
        acc[key] = {
          length: value.length,
          callCount: actionPerActionKey?.get(key)?.length ?? 0,
        };

        return acc;
      }, {});

      const actionsKeys = Object.keys(actions);

      return {
        actions,
        actionsKeys,
      };
    },
    {
      isEqual: shallowCompare,
    }
  );
};
