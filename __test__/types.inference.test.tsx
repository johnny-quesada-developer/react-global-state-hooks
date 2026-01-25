import { createContext, createGlobalState } from '..';
import type { InferActionsType, InferStateApi, InferContextApi } from '..';

type AssertType<TExpected, TActual extends TExpected> = TExpected extends TActual ? true : never;

describe('Type Inference Tests', () => {
  describe('createGlobalState - State Type Inference', () => {
    it('should infer primitive number state correctly', () => {
      type State = number;

      const useCounter = createGlobalState(0);
      const state = useCounter.getState();
      const _stateCheck: State = state;

      expect<AssertType<State, typeof state>>(true).toBe(true);
      expect(_stateCheck).not.toBeUndefined();
    });

    it('should infer primitive string state correctly', () => {
      type State = string;

      const useName = createGlobalState('John');
      const state = useName.getState();
      const _stateCheck: State = state;

      expect<AssertType<State, typeof state>>(true).toBe(true);
      expect(_stateCheck).not.toBeUndefined();
    });

    it('should infer primitive boolean state correctly', () => {
      type State = boolean;

      const useIsActive = createGlobalState(true);
      const state = useIsActive.getState();
      const _stateCheck: State = state;

      expect<AssertType<State, typeof state>>(true).toBe(true);
      expect(_stateCheck).not.toBeUndefined();
    });

    it('should infer object state correctly', () => {
      type State = { name: string; age: number };

      const useUser = createGlobalState({ name: 'John', age: 30 });
      const state = useUser.getState();
      const _stateCheck: State = state;

      expect<AssertType<State, typeof state>>(true).toBe(true);
      expect(_stateCheck).not.toBeUndefined();
    });

    it('should infer array state correctly', () => {
      type State = string[];

      const useTodos = createGlobalState<string[]>(['task1', 'task2']);
      const state = useTodos.getState();
      const _stateCheck: State = state;

      expect<AssertType<State, typeof state>>(true).toBe(true);
      expect(_stateCheck).not.toBeUndefined();
    });

    it('should infer complex nested object state correctly', () => {
      type State = {
        user: { name: string; age: number };
        settings: { theme: string; notifications: boolean };
        items: number[];
      };

      const useComplex = createGlobalState({
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark', notifications: true },
        items: [1, 2, 3],
      });
      const state = useComplex.getState();
      const _stateCheck: State = state;

      expect<AssertType<State, typeof state>>(true).toBe(true);
      expect(_stateCheck).not.toBeUndefined();
    });
  });

  describe('createGlobalState - Callback Initializer Inference', () => {
    it('should infer state from callback returning primitive', () => {
      type State = number;

      const useCounter = createGlobalState(() => 42);
      const state = useCounter.getState();
      const _stateCheck: State = state;

      expect<AssertType<State, typeof state>>(true).toBe(true);
      expect(_stateCheck).not.toBeUndefined();
    });

    it('should infer state from callback returning object', () => {
      type State = { name: string; age: number };

      const useUser = createGlobalState(() => ({ name: 'Jane', age: 25 }));
      const state = useUser.getState();
      const _stateCheck: State = state;

      expect<AssertType<State, typeof state>>(true).toBe(true);
      expect(_stateCheck).not.toBeUndefined();
    });

    it('should infer state from callback with complex logic', () => {
      type State = number;

      const useInitial = createGlobalState(() => {
        const base = 10;
        return base * 2;
      });
      const state = useInitial.getState();
      const _stateCheck: State = state;

      expect<AssertType<State, typeof state>>(true).toBe(true);
      expect(_stateCheck).not.toBeUndefined();
    });
  });

  describe('createGlobalState - Metadata Type Inference', () => {
    it('should infer metadata as BaseMetadata when not provided', () => {
      type Metadata = Record<string, unknown>;

      const useCounter = createGlobalState(0);
      const metadata = useCounter.getMetadata();
      const _metadataCheck: Metadata = metadata;

      expect<AssertType<Metadata, typeof metadata>>(true).toBe(true);
      expect(_metadataCheck).not.toBeUndefined();
    });

    it('should infer custom metadata object correctly', () => {
      type Metadata = { createdAt: number; author: string };

      const useCounter = createGlobalState(0, {
        metadata: { createdAt: Date.now(), author: 'John' },
      });
      const metadata = useCounter.getMetadata();
      const _metadataCheck: Metadata = metadata;

      expect<AssertType<Metadata, typeof metadata>>(true).toBe(true);
      expect(_metadataCheck).not.toBeUndefined();
    });

    it('should infer metadata from callback', () => {
      type Metadata = { timestamp: number };

      const useCounter = createGlobalState(0, {
        metadata: () => ({ timestamp: Date.now() }),
      });
      const metadata = useCounter.getMetadata();
      const _metadataCheck: Metadata = metadata;

      expect<AssertType<Metadata, typeof metadata>>(true).toBe(true);
      expect(_metadataCheck).not.toBeUndefined();
    });

    it('should infer complex metadata structure', () => {
      type Metadata = {
        version: string;
        features: string[];
        config: { maxRetries: number };
      };

      const useStore = createGlobalState(
        { count: 0 },
        {
          metadata: {
            version: '1.0.0',
            features: ['sync', 'persist'],
            config: { maxRetries: 3 },
          },
        },
      );
      const metadata = useStore.getMetadata();
      const _metadataCheck: Metadata = metadata;

      expect<AssertType<Metadata, typeof metadata>>(true).toBe(true);
      expect(_metadataCheck).not.toBeUndefined();
    });
  });

  describe('createGlobalState - Actions Type Inference', () => {
    it('should infer setState as state mutator when no actions provided', () => {
      type State = number;

      const useCounter = createGlobalState(0);
      const setState = useCounter.setState;
      const _setStateCheck: React.Dispatch<React.SetStateAction<State>> = setState;

      expect<AssertType<React.Dispatch<React.SetStateAction<State>>, typeof setState>>(true).toBe(true);
      expect(_setStateCheck).not.toBeUndefined();
    });

    it('should infer actions correctly when provided', () => {
      type Actions = {
        increment: () => void;
        decrement: () => void;
        add: (amount: number) => void;
      };

      const useCounter = createGlobalState(0, {
        actions: {
          increment() {
            return ({ setState }) => {
              setState((c) => c + 1);
            };
          },
          decrement() {
            return ({ setState }) => {
              setState((c) => c - 1);
            };
          },
          add(amount: number) {
            return ({ setState }) => {
              setState((c) => c + amount);
            };
          },
        },
      });
      const actions = useCounter.actions;
      const _actionsCheck: Actions = actions;

      expect<AssertType<Actions, typeof actions>>(true).toBe(true);
      expect(_actionsCheck).not.toBeUndefined();
    });

    it('should infer actions with return values', () => {
      type Actions = {
        getValue: () => number;
        setValue: (val: number) => number;
      };

      const useStore = createGlobalState(
        { value: 0 },
        {
          actions: {
            getValue() {
              return ({ getState }) => {
                return getState().value;
              };
            },
            setValue(val: number) {
              return ({ setState }) => {
                setState({ value: val });
                return val;
              };
            },
          },
        },
      );
      const actions = useStore.actions;
      const _actionsCheck: Actions = actions;

      expect<AssertType<Actions, typeof actions>>(true).toBe(true);
      expect(_actionsCheck).not.toBeUndefined();
    });

    it('should infer actions with metadata access', () => {
      type Actions = {
        incrementByMultiplier: () => void;
      };

      const useStore = createGlobalState(
        { count: 0 },
        {
          metadata: { multiplier: 2 },
          actions: {
            incrementByMultiplier() {
              return ({ setState, getMetadata }) => {
                const meta = getMetadata();
                setState((s) => ({ count: s.count + meta.multiplier }));
              };
            },
          },
        },
      );
      const actions = useStore.actions;
      const _actionsCheck: Actions = actions;

      expect<AssertType<Actions, typeof actions>>(true).toBe(true);
      expect(_actionsCheck).not.toBeUndefined();
    });
  });

  describe('createGlobalState - Combined Configurations', () => {
    it('should infer types with object state, metadata, and actions', () => {
      type State = { name: string; age: number };
      type Metadata = { version: string };
      type Actions = { updateName: (name: string) => void };

      const useUserStore = createGlobalState(
        { name: 'John', age: 30 },
        {
          metadata: { version: '1.0.0' },
          actions: {
            updateName(name: string) {
              return ({ setState }) => {
                setState((s) => ({ ...s, name }));
              };
            },
          },
        },
      );

      const state = useUserStore.getState();
      const actions = useUserStore.actions;
      const metadata = useUserStore.getMetadata();

      const _stateCheck: State = state;
      const _actionsCheck: Actions = actions;
      const _metadataCheck: Metadata = metadata;

      expect<AssertType<State, typeof state>>(true).toBe(true);
      expect<AssertType<Actions, typeof actions>>(true).toBe(true);
      expect<AssertType<Metadata, typeof metadata>>(true).toBe(true);
      expect(_stateCheck).not.toBeUndefined();
      expect(_actionsCheck).not.toBeUndefined();
      expect(_metadataCheck).not.toBeUndefined();
    });

    it('should infer types with callback state, callback metadata, and actions', () => {
      type State = { items: string[] };
      type Metadata = { createdAt: number };
      type Actions = { addItem: (item: string) => void };

      const useStore = createGlobalState(() => ({ items: [] as string[] }), {
        metadata: () => ({ createdAt: Date.now() }),
        actions: {
          addItem(item: string) {
            return ({ setState }) => {
              setState((s) => ({ items: [...s.items, item] }));
            };
          },
        },
      });

      const state = useStore.getState();
      const actions = useStore.actions;
      const metadata = useStore.getMetadata();

      const _stateCheck: State = state;
      const _actionsCheck: Actions = actions;
      const _metadataCheck: Metadata = metadata;

      expect<AssertType<State, typeof state>>(true).toBe(true);
      expect<AssertType<Actions, typeof actions>>(true).toBe(true);
      expect<AssertType<Metadata, typeof metadata>>(true).toBe(true);
      expect(_stateCheck).not.toBeUndefined();
      expect(_actionsCheck).not.toBeUndefined();
      expect(_metadataCheck).not.toBeUndefined();
    });
  });

  describe('createContext - State Type Inference', () => {
    it('should infer primitive number state correctly', () => {
      type State = number;

      const counter = createContext(0);
      type API = InferContextApi<typeof counter.Context>;
      type InferredState = ReturnType<API['getState']>;

      const _stateCheck: State = {} as InferredState;

      expect<AssertType<State, InferredState>>(true).toBe(true);
      expect(counter).not.toBeUndefined();
      expect(_stateCheck).not.toBeUndefined();
    });

    it('should infer primitive string state correctly', () => {
      type State = string;

      const name = createContext('John');
      type API = InferContextApi<typeof name.Context>;
      type InferredState = ReturnType<API['getState']>;
      const _stateCheck: State = {} as InferredState;

      expect<AssertType<State, InferredState>>(true).toBe(true);
      expect(name).not.toBeUndefined();
      expect(_stateCheck).not.toBeUndefined();
    });

    it('should infer object state correctly', () => {
      type State = { name: string; age: number };

      const user = createContext({ name: 'John', age: 30 });
      type API = InferContextApi<typeof user.Context>;
      type InferredState = ReturnType<API['getState']>;
      const _stateCheck: State = {} as InferredState;

      expect<AssertType<State, InferredState>>(true).toBe(true);
      expect(user).not.toBeUndefined();
      expect(_stateCheck).not.toBeUndefined();
    });

    it('should infer array state correctly', () => {
      type State = string[];

      const todos = createContext<string[]>(['task1', 'task2']);
      type API = InferContextApi<typeof todos.Context>;
      type InferredState = ReturnType<API['getState']>;
      const _stateCheck: State = {} as InferredState;

      expect<AssertType<State, InferredState>>(true).toBe(true);
      expect(todos).not.toBeUndefined();
      expect(_stateCheck).not.toBeUndefined();
    });

    it('should infer complex nested object state correctly', () => {
      type State = {
        user: { name: string; age: number };
        settings: { theme: string; notifications: boolean };
        items: number[];
      };
      const complex = createContext({
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark', notifications: true },
        items: [1, 2, 3],
      });
      type API = InferContextApi<typeof complex.Context>;
      type InferredState = ReturnType<API['getState']>;
      const _stateCheck: State = {} as InferredState;

      expect<AssertType<State, InferredState>>(true).toBe(true);
      expect(complex).not.toBeUndefined();
      expect(_stateCheck).not.toBeUndefined();
    });
  });

  describe('createContext - Callback Initializer Inference', () => {
    it('should infer state from callback returning primitive', () => {
      type State = number;
      const counter = createContext(() => 42);
      type API = InferContextApi<typeof counter.Context>;
      type InferredState = ReturnType<API['getState']>;
      const _stateCheck: State = {} as InferredState;

      expect<AssertType<State, InferredState>>(true).toBe(true);
      expect(counter).not.toBeUndefined();
      expect(_stateCheck).not.toBeUndefined();
    });

    it('should infer state from callback returning object', () => {
      type State = { name: string; age: number };
      const user = createContext(() => ({ name: 'Jane', age: 25 }));
      type API = InferContextApi<typeof user.Context>;
      type InferredState = ReturnType<API['getState']>;
      const _stateCheck: State = {} as InferredState;

      expect<AssertType<State, InferredState>>(true).toBe(true);
      expect(user).not.toBeUndefined();
      expect(_stateCheck).not.toBeUndefined();
    });
  });

  describe('createContext - Metadata Type Inference', () => {
    it('should infer metadata as BaseMetadata when not provided', () => {
      type Metadata = Record<string, unknown>;

      const counter = createContext(0);
      type API = InferContextApi<typeof counter.Context>;
      type InferredMetadata = ReturnType<API['getMetadata']>;
      const _metadataCheck: Metadata = {} as InferredMetadata;

      expect<AssertType<Metadata, InferredMetadata>>(true).toBe(true);
      expect(counter).not.toBeUndefined();
      expect(_metadataCheck).not.toBeUndefined();
    });

    it('should infer custom metadata object correctly', () => {
      type Metadata = { createdAt: number; author: string };
      const counter = createContext(0, {
        metadata: { createdAt: Date.now(), author: 'John' },
      });
      type API = InferContextApi<typeof counter.Context>;
      type InferredMetadata = ReturnType<API['getMetadata']>;
      const _metadataCheck: Metadata = {} as InferredMetadata;

      expect<AssertType<Metadata, InferredMetadata>>(true).toBe(true);
      expect(counter).not.toBeUndefined();
      expect(_metadataCheck).not.toBeUndefined();
    });

    it('should infer metadata from callback', () => {
      type Metadata = { timestamp: number };
      const counter = createContext(0, {
        metadata: () => ({ timestamp: Date.now() }),
      });
      type API = InferContextApi<typeof counter.Context>;
      type InferredMetadata = ReturnType<API['getMetadata']>;
      const _metadataCheck: Metadata = {} as InferredMetadata;

      expect<AssertType<Metadata, InferredMetadata>>(true).toBe(true);
      expect(counter).not.toBeUndefined();
      expect(_metadataCheck).not.toBeUndefined();
    });

    it('should infer complex metadata structure', () => {
      type Metadata = {
        version: string;
        features: string[];
        config: { maxRetries: number };
      };
      const store = createContext(
        { count: 0 },
        {
          metadata: {
            version: '1.0.0',
            features: ['sync', 'persist'],
            config: { maxRetries: 3 },
          },
        },
      );
      type API = InferContextApi<typeof store.Context>;
      type InferredMetadata = ReturnType<API['getMetadata']>;
      const _metadataCheck: Metadata = {} as InferredMetadata;

      expect<AssertType<Metadata, InferredMetadata>>(true).toBe(true);
      expect(store).not.toBeUndefined();
      expect(_metadataCheck).not.toBeUndefined();
    });
  });

  describe('createContext - Actions Type Inference', () => {
    it('should infer setState as state mutator when no actions provided', () => {
      type State = number;

      const counter = createContext(0);
      type API = InferContextApi<typeof counter.Context>;
      type InferredSetState = API['setState'];
      const _setStateCheck: React.Dispatch<React.SetStateAction<State>> = {} as InferredSetState;

      expect<AssertType<React.Dispatch<React.SetStateAction<State>>, InferredSetState>>(true).toBe(true);
      expect(counter).not.toBeUndefined();
      expect(_setStateCheck).not.toBeUndefined();
    });

    it('should infer actions correctly when provided', () => {
      type Actions = {
        increment: () => void;
        decrement: () => void;
        add: (amount: number) => void;
      };

      const counter = createContext(0, {
        actions: {
          increment() {
            return ({ setState }) => {
              setState((c) => c + 1);
            };
          },
          decrement() {
            return ({ setState }) => {
              setState((c) => c - 1);
            };
          },
          add(amount: number) {
            return ({ setState }) => {
              setState((c) => c + amount);
            };
          },
        },
      });
      type API = InferContextApi<typeof counter.Context>;
      type InferredActions = API['actions'];
      const _actionsCheck: Actions = {} as InferredActions;

      expect<AssertType<Actions, InferredActions>>(true).toBe(true);
      expect(counter).not.toBeUndefined();
      expect(_actionsCheck).not.toBeUndefined();
    });

    it('should infer actions with return values', () => {
      type Actions = {
        getValue: () => number;
        setValue: (val: number) => number;
      };

      const store = createContext(
        { value: 0 },
        {
          actions: {
            getValue() {
              return ({ getState }) => {
                return getState().value;
              };
            },
            setValue(val: number) {
              return ({ setState }) => {
                setState({ value: val });
                return val;
              };
            },
          },
        },
      );
      type API = InferContextApi<typeof store.Context>;
      type InferredActions = API['actions'];
      const _actionsCheck: Actions = {} as InferredActions;

      expect<AssertType<Actions, InferredActions>>(true).toBe(true);
      expect(store).not.toBeUndefined();
      expect(_actionsCheck).not.toBeUndefined();
    });

    it('should infer actions with metadata access', () => {
      type Actions = {
        incrementByMultiplier: () => void;
      };

      const store = createContext(
        { count: 0 },
        {
          metadata: { multiplier: 2 },
          actions: {
            incrementByMultiplier() {
              return ({ setState, getMetadata }) => {
                const meta = getMetadata();
                setState((s) => ({ count: s.count + meta.multiplier }));
              };
            },
          },
        },
      );
      type API = InferContextApi<typeof store.Context>;
      type InferredActions = API['actions'];
      const _actionsCheck: Actions = {} as InferredActions;

      expect<AssertType<Actions, InferredActions>>(true).toBe(true);
      expect(store).not.toBeUndefined();
      expect(_actionsCheck).not.toBeUndefined();
    });
  });

  describe('createContext - Combined Configurations', () => {
    it('should infer types with object state, metadata, and actions', () => {
      type State = { name: string; age: number };
      type Metadata = { version: string };
      type Actions = { updateName: (name: string) => void };

      const userStore = createContext(
        { name: 'John', age: 30 },
        {
          metadata: { version: '1.0.0' },
          actions: {
            updateName(name: string) {
              return ({ setState }) => {
                setState((s) => ({ ...s, name }));
              };
            },
          },
        },
      );

      type API = InferContextApi<typeof userStore.Context>;
      type InferredState = ReturnType<API['getState']>;
      type InferredActions = API['actions'];
      type InferredMetadata = ReturnType<API['getMetadata']>;

      const _stateCheck: State = {} as InferredState;
      const _actionsCheck: Actions = {} as InferredActions;
      const _metadataCheck: Metadata = {} as InferredMetadata;

      expect<AssertType<State, InferredState>>(true).toBe(true);
      expect<AssertType<Actions, InferredActions>>(true).toBe(true);
      expect<AssertType<Metadata, InferredMetadata>>(true).toBe(true);
      expect(userStore).not.toBeUndefined();
      expect(_stateCheck).not.toBeUndefined();
      expect(_actionsCheck).not.toBeUndefined();
      expect(_metadataCheck).not.toBeUndefined();
    });

    it('should infer types with callback state, callback metadata, and actions', () => {
      type State = { items: string[] };
      type Metadata = { createdAt: number };
      type Actions = { addItem: (item: string) => void };

      const store = createContext(() => ({ items: [] as string[] }), {
        metadata: () => ({ createdAt: Date.now() }),
        actions: {
          addItem(item: string) {
            return ({ setState }) => {
              setState((s) => ({ items: [...s.items, item] }));
            };
          },
        },
      });

      type API = InferContextApi<typeof store.Context>;
      type InferredState = ReturnType<API['getState']>;
      type InferredActions = API['actions'];
      type InferredMetadata = ReturnType<API['getMetadata']>;

      const _stateCheck: State = {} as InferredState;
      const _actionsCheck: Actions = {} as InferredActions;
      const _metadataCheck: Metadata = {} as InferredMetadata;

      expect<AssertType<State, InferredState>>(true).toBe(true);
      expect<AssertType<Actions, InferredActions>>(true).toBe(true);
      expect<AssertType<Metadata, InferredMetadata>>(true).toBe(true);
      expect(store).not.toBeUndefined();
      expect(_stateCheck).not.toBeUndefined();
      expect(_actionsCheck).not.toBeUndefined();
      expect(_metadataCheck).not.toBeUndefined();
    });
  });

  describe('Type Utility Inference', () => {
    it('should infer InferActionsType correctly for global state', () => {
      type ExpectedActions = {
        increment: () => void;
      };

      const useCounter = createGlobalState(0, {
        actions: {
          increment() {
            return ({ setState }) => {
              setState((c) => c + 1);
            };
          },
        },
      });

      type Actions = InferActionsType<typeof useCounter>;
      const actions = useCounter.actions;
      const _actionsCheck: Actions = actions;
      const _expectedCheck: ExpectedActions = actions;

      expect<AssertType<Actions, typeof actions>>(true).toBe(true);
      expect<AssertType<ExpectedActions, typeof actions>>(true).toBe(true);
      expect(_actionsCheck).not.toBeUndefined();
      expect(_expectedCheck).not.toBeUndefined();
    });

    it('should infer InferStateApi correctly for global state', () => {
      const useCounter = createGlobalState(0, {
        metadata: { version: '1.0.0' },
        actions: {
          increment() {
            return ({ setState }) => {
              setState((c) => c + 1);
            };
          },
        },
      });

      type API = InferStateApi<typeof useCounter>;
      const api: API = useCounter;

      expect<AssertType<API, typeof api>>(true).toBe(true);
      expect(api).not.toBeUndefined();
    });

    it('should infer InferContextApi correctly for context', () => {
      const counter = createContext(0, {
        metadata: { version: '1.0.0' },
        actions: {
          increment() {
            return ({ setState }) => {
              setState((c) => c + 1);
            };
          },
        },
      });

      type ContextAPI = InferContextApi<typeof counter.Context>;
      const { context } = counter.Provider.makeProviderWrapper();
      const _apiCheck: ContextAPI = context.current;

      expect<AssertType<ContextAPI, typeof context.current>>(true).toBe(true);
      expect(_apiCheck).toBeUndefined();
    });
  });
});
