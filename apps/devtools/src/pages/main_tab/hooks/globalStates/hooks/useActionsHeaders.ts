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

export const toHeader = (action: ActionJson): ActionHeader => ({
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
    headers.push(toHeader(action));
  }

  return headers;
};

const selectHeaders = (
  selectedStateId: GlobalStateId | null,
  actionIdsByStateId: EntityAdapter<GlobalStateId, Set<ActionId>>,
): ActionHeader[] => {
  if (isNil(selectedStateId)) return [];
  return buildHeaders(actionIdsByStateId.get(selectedStateId));
};

export const isEqualRoot =
  (selectedStateId: GlobalStateId | null) =>
  (
    current: EntityAdapter<GlobalStateId, Set<ActionId>>,
    next: EntityAdapter<GlobalStateId, Set<ActionId>>,
  ): boolean => {
    if (!selectedStateId) return current === next;
    return current.get(selectedStateId) === next.get(selectedStateId);
  };

export const useActionsHeaders = (): ActionHeader[] => {
  const [selectedStateId] = selectedGlobalStateId$();

  return actionIdsByStateId$.use.select(
    (actionIdsByStateId) => selectHeaders(selectedStateId, actionIdsByStateId),
    {
      dependencies: [selectedStateId],
      isEqualRoot: isEqualRoot(selectedStateId),
    },
  );
};
