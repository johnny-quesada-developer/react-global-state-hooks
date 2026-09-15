import { EntityAdapter } from '@src/shared/tools/EntityAdapter';
import type { GlobalStateMetaExtended } from './useGlobalStates.types';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';
import isNil from 'json-storage-formatter/isNil';

const globalStatesIdsByPath = new Map<string, GlobalStateId>();

export const addGlobalStateToPath = (globalStatePath: string, globalStateId: GlobalStateId) => {
  globalStatesIdsByPath.set(globalStatePath, globalStateId);
};

export const removeGlobalStatePath = (globalStatePath: string) => {
  globalStatesIdsByPath.delete(globalStatePath);
};

export const removeGlobalStatesOfPath = (
  globalStatePath: string,
  state: EntityAdapter<GlobalStateId, GlobalStateMetaExtended>
): EntityAdapter<GlobalStateId, GlobalStateMetaExtended> => {
  const isDeleteAll = globalStatePath === '*';
  if (isDeleteAll) {
    // starts from scratch
    return new EntityAdapter();
  }

  const globalStateId = globalStatesIdsByPath.get(globalStatePath);
  if (isNil(globalStateId)) return state;

  state.delete(globalStateId);
  globalStatesIdsByPath.delete(globalStatePath);

  return new EntityAdapter(state);
};
