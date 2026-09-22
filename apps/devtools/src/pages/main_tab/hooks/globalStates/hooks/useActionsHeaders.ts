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

export const isEqualRoot =
  (selectedStateId: GlobalStateId | null) =>
  (
    current: EntityAdapter<GlobalStateId, Set<ActionId>>,
    next: EntityAdapter<GlobalStateId, Set<ActionId>>,
  ): boolean => {
    if (!selectedStateId) return current === next;
    return current.get(selectedStateId) === next.get(selectedStateId);
  };
