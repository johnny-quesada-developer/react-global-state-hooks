import { describe, it, expect } from 'vitest';
import { EntityAdapter } from '@src/shared/tools/EntityAdapter';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';
import type { GlobalStateMetaExtended } from '../helpers/useGlobalStates.types';
import {
  addGlobalStateToPath,
  getGlobalStateIdsOfPath,
  removeGlobalStateIdFromPath,
  removeGlobalStatesOfPath,
} from '../helpers/globalStatesIdsByPath';

const id = (value: string) => value as GlobalStateId;

// Builds an adapter holding minimal metas for the given ids, so removeGlobalStatesOfPath has
// something to delete from.
const adapterWith = (ids: string[]) => {
  const adapter = new EntityAdapter<GlobalStateId, GlobalStateMetaExtended>({});
  for (const value of ids) adapter.add(id(value), { globalStateId: value } as GlobalStateMetaExtended);
  return adapter;
};

describe('globalStatesIdsByPath (multi-instance per path)', () => {
  it('keeps multiple ids for the same path in creation order', () => {
    const path = '/src/context/Provider.tsx#a';
    addGlobalStateToPath(path, id('a1'));
    addGlobalStateToPath(path, id('a2'));
    addGlobalStateToPath(path, id('a3'));

    expect(getGlobalStateIdsOfPath(path)).toEqual(['a1', 'a2', 'a3']);
  });

  it('does not duplicate the same id announced twice', () => {
    const path = '/src/context/Provider.tsx#dup';
    addGlobalStateToPath(path, id('d1'));
    addGlobalStateToPath(path, id('d1'));

    expect(getGlobalStateIdsOfPath(path)).toEqual(['d1']);
  });

  it('removes only the given instance, leaving the rest', () => {
    const path = '/src/context/Provider.tsx#b';
    addGlobalStateToPath(path, id('b1'));
    addGlobalStateToPath(path, id('b2'));

    removeGlobalStateIdFromPath(path, id('b1'));

    expect(getGlobalStateIdsOfPath(path)).toEqual(['b2']);
  });

  it('drops the path once its last instance is removed', () => {
    const path = '/src/context/Provider.tsx#c';
    addGlobalStateToPath(path, id('c1'));

    removeGlobalStateIdFromPath(path, id('c1'));

    expect(getGlobalStateIdsOfPath(path)).toEqual([]);
  });

  it('removeGlobalStatesOfPath deletes every instance of a path from the adapter', () => {
    const path = '/src/context/Provider.tsx#e';
    addGlobalStateToPath(path, id('e1'));
    addGlobalStateToPath(path, id('e2'));

    const next = removeGlobalStatesOfPath(path, adapterWith(['e1', 'e2', 'keep']));

    expect(next.has(id('e1'))).toBe(false);
    expect(next.has(id('e2'))).toBe(false);
    expect(next.has(id('keep'))).toBe(true);
    expect(getGlobalStateIdsOfPath(path)).toEqual([]);
  });

  it("'*' returns a fresh empty adapter (clears everything)", () => {
    addGlobalStateToPath('/src/some/path.ts', id('x1'));

    const next = removeGlobalStatesOfPath('*', adapterWith(['x1', 'x2']));

    expect(next.ids).toEqual([]);
  });
});
