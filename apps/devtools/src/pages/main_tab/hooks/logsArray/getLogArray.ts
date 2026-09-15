import { type EntityAdapter } from '../../../../shared/tools/EntityAdapter';
import { ActionJson } from '../../../../shared/schema/ActionJson';
import type { GlobalStateMetaExtended, StateLog } from '../globalStates/helpers/useGlobalStates.types';
import type { GlobalStateId } from '../../../../shared/schema/GlobalStateJson';
import { isSetStateSubAction } from '../../../../shared/tools';

export const getLogArray = ({
  actions,
  selectedStateKey,
  globalStates,
}: {
  actions: ActionJson[];
  selectedStateKey: GlobalStateId;
  globalStates: EntityAdapter<GlobalStateId, GlobalStateMetaExtended>;
}): StateLog[] => {
  const historyLogs: StateLog[] = [];

  const firstActionLog = actions[0] ?? null;
  const initialLog = firstActionLog?.logs[0] ?? null;

  let currentState = (() => {
    if (isSetStateSubAction(initialLog)) return initialLog.payload;

    return globalStates.get(selectedStateKey).initialState;
  })();

  let mainIndex = 0;
  for (let index = 0; index < actions.length; index++) {
    const { action, logs, actionType } = actions[index];

    for (let logIndex = 0; logIndex < logs.length; logIndex++) {
      const log = logs[logIndex];

      if (isSetStateSubAction(log)) {
        currentState = log.payload;
      }

      historyLogs.push({
        ...log,
        parentAction: action,
        state: currentState,
        parentActionType: actionType,
        index: mainIndex,
      });

      mainIndex++;
    }
  }

  return historyLogs;
};

export default getLogArray;
