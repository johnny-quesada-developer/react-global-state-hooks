import type { EntityAdapter } from '@src/shared/tools/EntityAdapter';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';
import type { GlobalStateMetaExtended } from './useGlobalStates.types';

export type OrderedGlobalState = {
  globalStateId: GlobalStateId;
  name: string;
  sort: number;
};

export const getOrderedGlobalStates = (
  globalStates: EntityAdapter<GlobalStateId, GlobalStateMetaExtended>,
): OrderedGlobalState[] => {
  return globalStates
    .entries()
    .map(([globalStateId, stateMeta]) => ({
      globalStateId,
      name: stateMeta.name ?? globalStateId ?? '',
      sort: Object.getOwnPropertyDescriptor(stateMeta.metadata ?? {}, 'sort')?.value ?? -1,
    }))
    .sort((a, b) => b.sort - a.sort || a.name.localeCompare(b.name));
};
