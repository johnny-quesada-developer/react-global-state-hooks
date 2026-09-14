import selectedGlobalStateId from '@src/pages/main_tab/hooks/selectedGlobalStateId';
import shallowCompare from 'react-global-state-hooks/shallowCompare';
import createContext from 'react-global-state-hooks/createContext';
import globalStates$ from '@src/pages/main_tab/hooks/globalStates';
import { buildActionPerActionKey } from '@src/pages/main_tab/hooks/globalStates/helpers/buildActionPerActionKey';

type ActionsContext = {
  actions: Record<
    string,
    {
      length: number;
      callCount: number;
    }
  >;
  actionsKeys: string[];
  selectedActionKey: string | null;
  actionParametersLength: number;
  filter: string;
};

const initialValue: ActionsContext = {
  actions: {},
  actionsKeys: [],
  selectedActionKey: null,
  actionParametersLength: 0,
  filter: '',
};

export const actions$ = createContext(initialValue, {
  actions: {
    setSelectedActionKey: (selectedActionKey: string) => {
      return ({ setState }) => {
        return setState((state) => ({
          ...state,
          selectedActionKey,
          actionParametersLength: state.actions[selectedActionKey]?.length ?? 0,
        }));
      };
    },
    setFilter: (filter: string) => {
      return ({ setState }) => {
        return setState((state) => ({ ...state, filter }));
      };
    },
  },
  callbacks: {
    onInit: ({ setState }) => {
      selectedGlobalStateId.subscribe(
        (globalStateId) => {
          if (!globalStateId) {
            return setState(initialValue);
          }

          const state = globalStates$.getState().get(globalStateId);
          const actionPerActionKey = buildActionPerActionKey(globalStateId);

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
              length: value?.length ?? 0,
              callCount: actionPerActionKey?.get(key)?.length ?? 0,
            };

            return acc;
          }, {});

          const actionsKeys = Object.keys(actions);

          setState({
            actions,
            actionsKeys,
            selectedActionKey: actionsKeys[0] ?? null,
            actionParametersLength: actions[actionsKeys[0] ?? '']?.length ?? 0,
            filter: '',
          });
        },
        {
          isEqual: shallowCompare,
        }
      );
    },
  },
});

export const useActionParametersLength = actions$.use.createSelectorHook((state) => state.actionParametersLength);

export const useSelectedActionKey = actions$.use.createSelectorHook((state) => state.selectedActionKey);

export const useActions = actions$.use.createSelectorHook((state) => state.actions);

export const useActionsKeys = actions$.use.createSelectorHook((state) => state.actionsKeys);

export const useActionsFilter = actions$.use.createSelectorHook((state) => state.filter);

export default actions$;
