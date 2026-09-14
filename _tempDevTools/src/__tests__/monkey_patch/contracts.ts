export type DevtoolsWireMessage = {
  action: string;
  payload?: unknown;
  id?: string;
  timestamp?: number;
  [key: string]: unknown;
};

export type StoreActions = Record<string, unknown>;

export type StoreActionsMap = {
  actions: StoreActions;
  storeTools: Record<string, unknown>;
};

export interface MockStore<State = Record<string, unknown>> {
  state: State;
  setState: (...args: unknown[]) => unknown;
  getMainHook: (...args: unknown[]) => unknown;
  dispose: (...args: unknown[]) => unknown;
  getStoreActionsMap: (...args: unknown[]) => StoreActionsMap;
  createSelectorHook: (...args: unknown[]) => unknown;
  actionsConfig?: StoreActions;
  [key: string]: unknown;
}

export interface PatchedStore extends MockStore {
  _DEV_TOOLS_STORE_ID: string;
  __devtools_initialize_getStoreActionsMapWrapped: () => StoreActionsMap;
}

export type ReactGlobalStateHookDebug = (store: MockStore, args: unknown, storePath: string) => PatchedStore;

export type DebugGlobalThis = typeof globalThis & {
  REACT_GLOBAL_STATE_HOOK_DEBUG: ReactGlobalStateHookDebug;
  __reactDevToolsConnectCallback?: (event?: unknown) => void;
};

export type UniqueIdMock = jest.Mock<string, [string]> & {
  for: (prefix: string) => () => string;
};
