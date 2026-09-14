import { EntityAdapter } from '@src/shared/tools/EntityAdapter';

/**
 * Normalize the top-level action logs of a mock example so they satisfy the
 * ActionLogJson / ActionJson schema and, crucially, render follow-up states.
 *
 * The panel only advances the displayed state on logs whose `subAction === 'setState'`
 * (see getLogArray.ts / isSetStateSubAction.ts). Older fixtures (the devtools example)
 * were authored before `subAction` existed, so every log rendered as the initial
 * state. This backfills the fields those fixtures are missing:
 *   - log.subAction  -> 'setState' (unless already set, e.g. to null/getLocalStorageItem)
 *   - log.timestamp  -> derived from the action's `start` when absent
 *   - log.scope      -> 'lifecycle' when absent
 *   - action.actionType -> 'LIFE_CYCLE' when absent
 *
 * It only touches each store's own top-level `groupedByActionStateLogs`; nested
 * `initialState`/`currentState` payloads (which merely happen to contain log-shaped
 * data) are left untouched because loadMockState never reads them as logs.
 */
export function normalizeExampleLogs<T extends { entities: Record<string, any>; ids: string[] }>(example: T): T {
  for (const stateId of example.ids) {
    const store = example.entities[stateId];
    const grouped = store?.groupedByActionStateLogs;
    if (!grouped?.entities) continue;

    for (const actionId of grouped.ids ?? Object.keys(grouped.entities)) {
      const action = grouped.entities[actionId];
      if (!action) continue;

      if (action.actionType == null) {
        action.actionType = 'LIFE_CYCLE';
      }

      if (!Array.isArray(action.logs)) continue;

      for (const log of action.logs) {
        if (!log || typeof log !== 'object') continue;

        if (!('subAction' in log)) {
          log.subAction = 'setState';
        }
        if (log.timestamp == null) {
          log.timestamp = action.start ?? Date.now();
        }
        if (log.scope == null) {
          log.scope = 'lifecycle';
        }
      }
    }
  }

  return example;
}

// Helper function to check if an object has both `entities` and `ids` properties
function isEntityStructure(obj: any): obj is { entities: any; ids: any[] } {
  return obj && typeof obj === 'object' && 'entities' in obj && 'ids' in obj;
}

// Recursive function to transform the target object
export function transformEntities(obj: any): any {
  if (Array.isArray(obj)) {
    // If the object is an array, recursively apply the transformation to its elements
    return obj.map(transformEntities);
  } else if (obj && typeof obj === 'object') {
    // Traverse through each key of the object
    for (const key in obj) {
      if (obj[key]) {
        const value = obj[key];

        // If `entities` and `ids` are present, replace it with the EntityAdapter
        if (isEntityStructure(value)) {
          obj[key] = new EntityAdapter(value);
        } else {
          // Recursively apply the transformation to nested objects
          obj[key] = transformEntities(value);
        }
      }
    }
  }
  return obj; // Return the transformed object
}
