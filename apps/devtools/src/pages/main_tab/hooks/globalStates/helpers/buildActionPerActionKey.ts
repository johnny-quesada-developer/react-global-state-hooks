import type { ActionId } from '@src/shared/schema/ActionJson';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';
import { EntityAdapter } from '@src/shared/tools/EntityAdapter';
import { actionKeysByStateId$ } from '../globalStates';

/**
 * Builds the per-state `actionKey -> ordered ActionId[]` view for a store, read
 * directly from the store-keyed index (no scanning of other stores).
 */
export const buildActionPerActionKey = (stateId: GlobalStateId | null) => {
  const actionPerActionKey = new EntityAdapter<string, ActionId[]>({});
  if (!stateId) return actionPerActionKey;

  const keysByActionKey = actionKeysByStateId$.getState().get(stateId);
  if (!keysByActionKey) return actionPerActionKey;

  for (const [actionKey, actionIds] of keysByActionKey) {
    actionPerActionKey.add(actionKey, actionIds);
  }

  return actionPerActionKey;
};
