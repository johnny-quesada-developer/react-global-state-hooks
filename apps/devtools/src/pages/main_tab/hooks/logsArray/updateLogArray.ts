import type { ActionJson } from '../../../../shared/schema';
import { isSetStateSubAction } from '../../../../shared/tools';
import type { StateLog } from '../globalStates/helpers/useGlobalStates.types';

export const updateLogArray = ({
  historyLogs,
  newAction,
}: {
  historyLogs: StateLog[];
  newAction: ActionJson;
}): StateLog[] => {
  if (historyLogs.length === 0) {
    throw new Error('updateLogArray requires at least one existing log.');
  }

  const lastLog = historyLogs[historyLogs.length - 1];
  const isActionUpdate = lastLog.actionId === newAction.actionId;

  let mainIndex = lastLog.index + 1;
  let currentState = lastLog.state;

  const logsToExtend = (() => {
    if (!isActionUpdate) return newAction.logs;

    // remove the logs that are already in the history
    const offSet = newAction.logs.findIndex((log) => log.logId === lastLog.logId);
    return newAction.logs.slice(offSet + 1);
  })();

  const newHistory = historyLogs.slice();

  for (let index = 0; index < logsToExtend.length; index++) {
    const log = logsToExtend[index];

    if (isSetStateSubAction(log)) {
      currentState = log.payload;
    }

    newHistory.push({
      ...log,
      parentAction: newAction.action,
      state: currentState,
      parentActionType: newAction.actionType,
      index: mainIndex,
    });

    mainIndex++;
  }

  return newHistory;
};

export default updateLogArray;
