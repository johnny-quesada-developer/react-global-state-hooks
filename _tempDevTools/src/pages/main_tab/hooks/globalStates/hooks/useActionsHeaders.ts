import isNil from 'json-storage-formatter/isNil';
import selectedGlobalStateId$ from '../../selectedGlobalStateId';
import { actionsById$, actionIdsByStateId$ } from '../globalStates';
import { type ActionTypeJsonEnum } from '@src/shared/schema/ActionTypeJson';
import { type EntityAdapter } from '@src/shared/tools/EntityAdapter';
import type { ActionId, ActionJson } from '@src/shared/schema/ActionJson';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';

export type ActionHeader = {
  actionId: ActionId;
  globalStateId: GlobalStateId;
  action: string;
  actionType: ActionTypeJsonEnum;
  timestamp: number;
  hasError: boolean;
  logsCount: number;
};

const toHeader = (action: ActionJson): ActionHeader => ({
  actionId: action.actionId,
  globalStateId: action.globalStateId,
  action: action.action,
  actionType: action.actionType,
  timestamp: action.logs[0].timestamp,
  hasError: action.logs.some((log) => log.case === 'rejected'),
  logsCount: action.logs.length,
});

export const mapGroupedToHeaders = (grouped: EntityAdapter<ActionId, ActionJson>): ActionHeader[] => {
  return grouped.values().map(toHeader);
};

const buildHeaders = (actionIds: Set<ActionId> | undefined): ActionHeader[] => {
  if (!actionIds) return [];
  const actionsById = actionsById$.getState();
  const headers: ActionHeader[] = [];

  for (const actionId of actionIds) {
    const action = actionsById.get(actionId);
    if (action) headers.push(toHeader(action));
  }

  return headers;
};

export const useActionsHeaders = (): ActionHeader[] => {
  const [selectedStateId] = selectedGlobalStateId$();

  return actionIdsByStateId$.use.select(
    (actionIdsByStateId) => {
      if (isNil(selectedStateId)) return [];

      return buildHeaders(actionIdsByStateId.get(selectedStateId));
    },
    {
      dependencies: [selectedStateId],
      isEqualRoot: (current, next): boolean => {
        if (!selectedStateId) return current === next;

        return current.get(selectedStateId) === next.get(selectedStateId);
      },
    }
  );
};
