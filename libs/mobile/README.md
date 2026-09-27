# react-native-global-state-hooks 🌟

<div align="center">

![Johnny Quesada](https://raw.githubusercontent.com/johnny-quesada-developer/global-hooks-example/main/public/avatar2.jpeg)

</div>

<div align="center">

**Shared state that feels like `useState`.**

Share state across your React Native screens with the familiar `useState` API, subscribe to only the slice a component needs, and grow into typed actions, chainable selectors, and scoped stores. Persist what matters with asynchronous storage.

[![npm version](https://img.shields.io/npm/v/react-native-global-state-hooks.svg)](https://www.npmjs.com/package/react-native-global-state-hooks)
[![Downloads](https://img.shields.io/npm/dm/react-native-global-state-hooks.svg)](https://www.npmjs.com/package/react-native-global-state-hooks)
[![License](https://img.shields.io/npm/l/react-native-global-state-hooks.svg)](https://github.com/johnny-quesada-developer/react-global-state-hooks/blob/master/LICENSE)

[**Website**](https://johnny-quesada-developer.github.io/react-global-state-hooks/) · [**Documentation**](https://johnny-quesada-developer.github.io/react-global-state-hooks/docs/) · [**Examples**](https://johnny-quesada-developer.github.io/react-global-state-hooks/examples/) · [**Platform guide**](https://johnny-quesada-developer.github.io/react-global-state-hooks/docs/platform-and-versions/)

Created by [Johnny Quesada](https://johnny-quesada-developer.github.io/react-global-state-hooks/about/), author of the React Global State Hooks family.

</div>

---

## Start with a single hook

```tsx
import { createGlobalState } from "react-native-global-state-hooks";

export const useCounter = createGlobalState(0);
```

A shared store, ready to use. Global hooks work without a provider; use `createContext` when a subtree needs its own instance.

```tsx
// Use it anywhere, instantly
import { Button } from "react-native";

function Counter() {
  const [count, setCount] = useCounter();
  return <Button title={`Count: ${count}`} onPress={() => setCount(count + 1)} />;
}
```

---

## Built for React applications

### **Familiar React API**

If you know `useState`, you already know the API.

```tsx
// Local state
const [count, setCount] = useState(0);

// Shared state
const [count, setCount] = useCounter();
```

### **Precise Subscriptions**

Subscribe to a slice, so unrelated store changes do not re-render your component.

```tsx
// Only re-renders when name changes
const [name] = useStore((state) => state.user.name);
```

### **Chainable Selectors**

Build reusable state hooks on top of other selector hooks.

```tsx
const useUsers = useStore.createSelectorHook((state) => state.users);

const useAdmins = useUsers.createSelectorHook((users) => users.filter((user) => user.isAdmin));
```

### **Actions (Optional)**

Keep mutation logic next to the store when a feature needs more structure.

```tsx
const useAuth = createGlobalState(null, {
  actions: {
    login(credentials) {
      return async ({ setState }) => {
        const user = await api.login(credentials);

        setState(user);
      };
    },
  },
});
```

### **Context Mode**

Need an isolated instance instead of app-wide state? Same state model, inside a provider.

```tsx
const Form = createContext({ name: "", email: "" });

<Form.Provider>
  <FormFields />
</Form.Provider>;
```

### **Persistence with Async Storage**

Keep preferences and drafts across app restarts.

```tsx
const useSettings = createGlobalState(
  { theme: "dark" },
  {
    asyncStorage: {
      key: "settings",
    },
  },
);
```

### **Non-Reactive API**

Read, update, or subscribe to state outside React components.

```tsx
const token = useAuth.getState().token;

useAuth.setState({ user: nextUser });
```

---

## Installation

```bash
npm install react-native-global-state-hooks
```

**Platform-specific with built-in storage:**

- 🌐 **Web**: `react-global-state-hooks` (localStorage)
- 📱 **React Native**: `react-native-global-state-hooks` (AsyncStorage by default, customizable, optional dependency)

### Persisted State

The core state library does **not** require AsyncStorage. Install it when you want the built-in React Native persistence backend:

```bash
npm install @react-native-async-storage/async-storage
```

`@react-native-async-storage/async-storage` is an **optional peer dependency**. You can also provide your own async storage manager or a per-store persistence adapter.

---

## Quick Start

### Your first shared store

```tsx
import { Button, Text } from "react-native";
import { createGlobalState } from "react-native-global-state-hooks";

// 1. Create it (anywhere)
const useTheme = createGlobalState("dark" as "light" | "dark");

// 2. Use it (everywhere)
function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  return <Button title={`${theme} mode`} onPress={() => setTheme(theme === "dark" ? "light" : "dark")} />;
}

function ThemedScreen() {
  const [theme] = useTheme();
  return <Text>Themed content, {theme} mode</Text>;
}
```

### Async state with actions

Keep loading and error values in state so screens update throughout the request.

```tsx
import { Button, Text, View } from "react-native";
import { createGlobalState } from "react-native-global-state-hooks";

type User = { id: string; name: string };

const useAuth = createGlobalState(
  () => ({ user: null as User | null, isLoading: false, error: null as string | null }),
  {
    actions: {
      login(authenticate: () => Promise<User>) {
        return async ({ setState }) => {
          setState((state) => ({ ...state, isLoading: true, error: null }));
          try {
            const user = await authenticate();
            setState({ user, isLoading: false, error: null });
          } catch (error) {
            setState((state) => ({
              ...state,
              isLoading: false,
              error: error instanceof Error ? error.message : "Sign-in failed",
            }));
          }
        };
      },
      logout() {
        return ({ setState }) => {
          setState({ user: null, isLoading: false, error: null });
        };
      },
    },
  },
);

function LoginButton({ authenticate }: { authenticate: () => Promise<User> }) {
  const [{ isLoading, error }, actions] = useAuth();

  return (
    <View>
      <Button
        disabled={isLoading}
        title={isLoading ? "Signing in…" : "Sign in"}
        onPress={() => void actions.login(authenticate)}
      />
      {error ? <Text>{error}</Text> : null}
    </View>
  );
}
```

### Readiness of a persisted store

A persisted React Native store restores **asynchronously**, so the hook also exposes storage readiness through metadata.

```tsx
import { ActivityIndicator, Switch, Text, View } from "react-native";
import { createGlobalState } from "react-native-global-state-hooks";
import { z } from "zod";

const settings = z.object({
  darkMode: z.boolean(),
  haptics: z.boolean(),
});

type Settings = z.infer<typeof settings>;

const useSettings = createGlobalState(
  { darkMode: true, haptics: true } as Settings,
  {
    asyncStorage: {
      key: "app-settings",

      // A parse error is caught by the store, which then keeps the initial state
      validator: ({ restored, initial }) => settings.parse({ ...initial, ...(restored as object) }),
    },

    actions: {
      setDarkMode(enabled: boolean) {
        return ({ setState }) => {
          setState((state) => ({ ...state, darkMode: enabled }));
        };
      },
    },
  },
);

function SettingsScreen() {
  const [settings, actions, { isAsyncStorageReady }] = useSettings();

  if (!isAsyncStorageReady) {
    return <ActivityIndicator />;
  }

  return (
    <View>
      <Text>Dark mode</Text>
      <Switch value={settings.darkMode} onValueChange={actions.setDarkMode} />
    </View>
  );
}
```

---

## Core Features Deep Dive

### Global State with `createGlobalState`

Create state that lives outside the component tree and can be consumed anywhere in your React Native app.

#### The Basics

```tsx
import { createGlobalState } from "react-native-global-state-hooks";

// Primitives
const useCount = createGlobalState(0);
const useTheme = createGlobalState("light" as "light" | "dark");
const useIsOnline = createGlobalState(true);

// Objects
const useUser = createGlobalState({
  name: "Guest",
  role: "viewer",
});

// Arrays
const useTodos = createGlobalState([
  { id: 1, text: "Learn the library", done: true },
  { id: 2, text: "Build something", done: false },
]);
```

#### Focused subscriptions with Selectors

```tsx
const useStore = createGlobalState({
  user: {
    name: "Johnny",
    email: "johnny@example.com",
  },
  theme: "dark",
  notifications: [],
  settings: {
    sound: true,
    haptics: true,
  },
});

function UserName() {
  const [name] = useStore((state) => state.user.name);

  return <Text>{name}</Text>;
}

function ThemeLabel() {
  const theme = useStore.select((state) => state.theme);

  return <Text>{theme}</Text>;
}

function NotificationCount() {
  const [notifications] = useStore((state) => state.notifications);

  return <Text>{notifications.length}</Text>;
}
```

Each component subscribes to the value it actually uses instead of blindly reacting to the whole state object.

#### Computed Values with Dependencies

Selectors can also depend on component-local values.

```tsx
const useTodos = createGlobalState({
  todos: [
    { id: 1, text: "Task 1", completed: false, priority: "high" },
    { id: 2, text: "Task 2", completed: true, priority: "low" },
    { id: 3, text: "Task 3", completed: false, priority: "high" },
  ],
});

function TodoList() {
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  const [todos] = useTodos(
    (state) => {
      if (filter === "active") {
        return state.todos.filter((todo) => !todo.completed);
      }

      if (filter === "completed") {
        return state.todos.filter((todo) => todo.completed);
      }

      return state.todos;
    },
    [filter],
  );

  return (
    <View>
      {todos.map((todo) => (
        <Text key={todo.id}>{todo.text}</Text>
      ))}
    </View>
  );
}
```

For more control, pass an options object:

```tsx
const [todos] = useTodos(
  (state) =>
    state.todos.filter((todo) => (filter === "all" ? true : todo.completed === (filter === "completed"))),
  {
    dependencies: [filter],
    isEqualRoot: (previous, next) => previous.todos === next.todos,
  },
);
```

#### Reusable Selector Hooks

Create hooks from hooks and compose them.

```tsx
const useStore = createGlobalState({
  users: [
    { id: 1, name: "Alice", role: "admin", active: true },
    { id: 2, name: "Bob", role: "user", active: true },
    { id: 3, name: "Charlie", role: "admin", active: false },
  ],
});

const useUsers = useStore.createSelectorHook((state) => state.users);

const useActiveUsers = useUsers.createSelectorHook((users) => users.filter((user) => user.active));

const useActiveAdmins = useActiveUsers.createSelectorHook((users) =>
  users.filter((user) => user.role === "admin"),
);

function UserStats() {
  const users = useUsers();
  const activeUsers = useActiveUsers();
  const activeAdmins = useActiveAdmins();

  return (
    <View>
      <Text>Total: {users.length}</Text>
      <Text>Active: {activeUsers.length}</Text>
      <Text>Active admins: {activeAdmins.length}</Text>
    </View>
  );
}
```

#### Actions — When You Need Structure

Actions are optional. Add them when you want a defined mutation API.

```tsx
type Todo = {
  id: string;
  text: string;
  completed: boolean;
};

const useTodos = createGlobalState(
  {
    todos: [] as Todo[],
    filter: "all" as "all" | "active" | "completed",
  },
  {
    actions: {
      addTodo(text: string) {
        return ({ setState }) => {
          const todo: Todo = {
            id: `${Date.now()}`,
            text,
            completed: false,
          };

          setState((state) => ({
            ...state,
            todos: [...state.todos, todo],
          }));
        };
      },

      toggleTodo(id: string) {
        return ({ setState }) => {
          setState((state) => ({
            ...state,
            todos: state.todos.map((todo) =>
              todo.id === id ? { ...todo, completed: !todo.completed } : todo,
            ),
          }));
        };
      },

      setFilter(filter: "all" | "active" | "completed") {
        return ({ setState }) => {
          setState((state) => ({
            ...state,
            filter,
          }));
        };
      },
    },
  },
);

function TodoActions() {
  const [, actions] = useTodos();

  return <Button title="Add todo" onPress={() => actions.addTodo("New task")} />;
}
```

#### Non-Reactive API — Use Outside React

The store hook also exposes its API directly.

```tsx
const useAuth = createGlobalState({
  user: null as null | { id: string; name: string },
  token: null as string | null,
});
```

Read state outside a component:

```tsx
const auth = useAuth.getState();
```

Update it:

```tsx
useAuth.setState((state) => ({
  ...state,
  user: {
    id: "42",
    name: "Johnny",
  },
}));
```

Subscribe to a state fragment:

```tsx
const unsubscribe = useAuth.subscribe(
  (state) => state.user,
  (user) => {
    console.log("User changed:", user);
  },
);

// Later
unsubscribe();
```

This is useful for networking layers, app lifecycle handlers, push-notification handlers, analytics, and other code that does not render UI.

#### Observable Fragments

Create observable slices of state for reactive workflows outside components.

```tsx
const useStore = createGlobalState({
  count: 0,
  user: {
    name: "Johnny",
  },
});

const countObservable = useStore.createObservable((state) => state.count);

countObservable.subscribe((count) => {
  console.log("Count:", count);
});

console.log(countObservable.getState());

const doubledObservable = countObservable.createObservable((count) => count * 2);
```

#### Metadata — Non-Reactive Side Information

Metadata is useful for information that belongs to the store but should not independently trigger component updates.

```tsx
const useFeed = createGlobalState(
  { items: [] as string[] },
  {
    metadata: {
      isLoading: false,
      lastFetch: null as Date | null,
      error: null as Error | null,
    },
  },
);
```

Read or update it through the store API:

```tsx
useFeed.setMetadata((metadata) => ({
  ...metadata,
  isLoading: true,
}));

const metadata = useFeed.metadata;

console.log(metadata.isLoading);
```

Persisted Native stores extend metadata with:

```tsx
const [, , { isAsyncStorageReady, asyncStorageKey }] = useSettings();
```

`isAsyncStorageReady` is specifically about the asynchronous persistence initialization lifecycle. Arbitrary metadata remains non-reactive.

---

### Persisted State with Async Storage

This is the major platform-specific feature of `react-native-global-state-hooks`.

Unlike browser `localStorage`, React Native persistence is **asynchronous**. A persisted store starts with its initial state, checks storage asynchronously, validates or migrates the restored value, and then marks the persistence initialization as ready.

#### Basic Persistence

```tsx
import { createGlobalState } from "react-native-global-state-hooks";
import { z } from "zod";

const settings = z.object({
  theme: z.enum(["light", "dark"]),
  language: z.string(),
});

type Settings = z.infer<typeof settings>;

const initialSettings: Settings = {
  theme: "dark",
  language: "en",
};

const useSettings = createGlobalState(initialSettings, {
  asyncStorage: {
    key: "app-settings",

    validator: ({ restored, initial }) => settings.parse({ ...initial, ...(restored as object) }),
  },
});
```

The built-in persistence flow:

- ✅ Restores the value asynchronously
- ✅ Persists state changes asynchronously
- ✅ Tracks restore readiness in store metadata
- ✅ Validates restored state
- ✅ Supports schema versioning and migration
- ✅ Supports custom error handling
- ✅ Uses a configurable async storage backend

#### Async Restore & `isAsyncStorageReady`

Because storage access is asynchronous, the initial state can be available before persisted state has finished loading.

```tsx
function AppSettings() {
  const [settings, , { isAsyncStorageReady }] = useSettings();

  if (!isAsyncStorageReady) {
    return <ActivityIndicator />;
  }

  return <Text>Theme: {settings.theme}</Text>;
}
```

`isAsyncStorageReady` starts as `false` for a persisted store and becomes `true` after the storage initialization flow has completed.

That initialization can:

1. Read the stored value
2. Migrate it when necessary
3. Validate the result
4. Update the store
5. Persist the normalized value
6. Mark Async Storage as ready

This is fundamentally different from synchronous browser `localStorage`.

#### Validation

The current Native persistence configuration includes a `validator`.

```tsx
import { z } from "zod";

const profile = z.object({
  name: z.string(),
  email: z.string(),
});

const useProfile = createGlobalState(initialProfile, {
  asyncStorage: {
    key: "profile",

    validator: ({ restored, initial }) => profile.parse({ ...initial, ...(restored as object) }),
  },
});
```

The validator receives:

- **`restored`** — the value loaded from persistence
- **`initial`** — the store's current initial value

Return behavior:

- Return a value → that value becomes the restored state
- Return `initial` → reject the persisted value and fall back
- Return `undefined` → accept the restored value as-is
- Throw → same as returning `initial`, and the error reaches `onError`. This is why a schema can be the
  whole validator

Validate the state, not the fragment. `restored` holds only what the `selector` saved, so merge it over
`initial` first: `({ restored, initial }) => schema.parse({ ...initial, ...restored })`

The validator also runs after migration.

#### Versioning & Migration

Persisted schemas evolve. Native persistence can migrate old values before committing them to the current store.

```tsx
import { z } from "zod";

const preferences = z.object({
  theme: z.enum(["light", "dark"]),
  notifications: z.boolean(),
});

type Preferences = z.infer<typeof preferences>;

const initialPreferences: Preferences = {
  theme: "dark",
  notifications: true,
};

const usePreferences = createGlobalState(initialPreferences, {
  asyncStorage: {
    key: "preferences",

    versioning: {
      version: 2,

      migrator: ({ legacy, initial }) => {
        if (legacy && typeof legacy === "object" && "theme" in legacy) {
          return {
            ...initial,
            theme: legacy.theme === "light" ? "light" : "dark",
          };
        }

        return initial;
      },
    },

    validator: ({ restored, initial }) => preferences.parse({ ...initial, ...(restored as object) }),
  },
});
```

With the built-in persistence path:

1. The stored item carries its schema version
2. A version mismatch can invoke `migrator`
3. The migrated result goes through `validator`
4. The normalized state is committed and persisted

#### Persistence Errors

Handle storage, serialization, validation, or migration failures without mixing them into your UI state.

```tsx
import { z } from "zod";

const settings = z.object({ theme: z.enum(["light", "dark"]), language: z.string() });

const useSettings = createGlobalState(initialSettings, {
  asyncStorage: {
    key: "settings",

    validator: ({ restored, initial }) => settings.parse({ ...initial, ...(restored as object) }),

    onError(error) {
      reportError(error);
    },
  },
});
```

If `onError` is omitted, the library reports persistence failures to `console.error`.

#### Custom Async Storage Manager

By default, the library attempts to use:

```text
@react-native-async-storage/async-storage
```

That package is optional. You can replace the low-level storage manager globally.

A manager works with **strings**, just like AsyncStorage:

```tsx
import { asyncStorageWrapper, type AsyncStorageManager } from "react-native-global-state-hooks";

const customStorage: AsyncStorageManager = {
  async getItem(key) {
    return myStorage.getString(key);
  },

  async setItem(key, value) {
    await myStorage.setString(key, value);
  },
};

await asyncStorageWrapper.addAsyncStorageManager(async () => {
  return customStorage;
});
```

Configure the manager before persisted stores need to initialize.

The library still owns formatting, restoration, validation, and version envelopes when you use this low-level manager.

#### Per-Store Persistence Adapter

Need one store to use a completely different persistence mechanism? Use `adapter`.

Unlike the global storage manager, an adapter works with the actual **State value**, not serialized strings.

```tsx
import { z } from "zod";

const settings = z.object({ theme: z.enum(["light", "dark"]), language: z.string() });

const useSettings = createGlobalState(initialSettings, {
  asyncStorage: {
    key: "settings",

    validator: ({ restored, initial }) => settings.parse({ ...initial, ...(restored as object) }),

    adapter: {
      async getItem(key) {
        return settingsDatabase.get(key);
      },

      async setItem(key, value) {
        await settingsDatabase.set(key, value);
      },
    },
  },
});
```

When an adapter is provided:

- ✅ The adapter controls storage for that store
- ✅ `getItem()` and `setItem()` work with the store's state value
- ✅ Validation still applies
- ❌ Built-in versioning/migration is bypassed
- ❌ Built-in string serialization is bypassed

Use the global manager when you want to replace the AsyncStorage-compatible backend for the app.

Use an adapter when a specific store needs custom persistence behavior.

> **Native difference:** the Native `asyncStorage` configuration does not expose the web package's `selector` option for selective persistence. If only part of a state should be persisted, split that persisted data into its own store or implement the desired behavior through an adapter.

---

### Scoped State with `createContext`

Sometimes state should belong to one subtree rather than the entire application.

#### The Basics

```tsx
import { TextInput, View } from "react-native";
import { createContext } from "react-native-global-state-hooks";

const UserForm = createContext({
  name: "",
  email: "",
});

function App() {
  return (
    <UserForm.Provider>
      <FormFields />
    </UserForm.Provider>
  );
}

function FormFields() {
  const [form, setForm] = UserForm.use();

  return (
    <View>
      <TextInput
        value={form.name}
        onChangeText={(name) => {
          setForm((state) => ({
            ...state,
            name,
          }));
        }}
      />

      <TextInput
        value={form.email}
        onChangeText={(email) => {
          setForm((state) => ({
            ...state,
            email,
          }));
        }}
      />
    </View>
  );
}
```

#### Provider Variations

Use the default value:

```tsx
<Theme.Provider>
  <Screen />
</Theme.Provider>
```

Provide a value for one subtree:

```tsx
<Theme.Provider value="dark">
  <Screen />
</Theme.Provider>
```

Or derive a value from the context's initial value:

```tsx
<Theme.Provider value={(initial) => (initial === "dark" ? "light" : "dark")}>
  <Screen />
</Theme.Provider>
```

#### Context selectors

```tsx
const Profile = createContext({
  user: {
    name: "",
    email: "",
  },
  settings: {
    darkMode: false,
  },
});

function UserName() {
  const [name] = Profile.use((state) => state.user.name);

  return <Text>{name}</Text>;
}
```

#### Context with Actions

```tsx
const Counter = createContext(0, {
  actions: {
    increment(amount = 1) {
      return ({ setState, getState }) => {
        setState(getState() + amount);
      };
    },

    reset() {
      return ({ setState }) => {
        setState(0);
      };
    },
  },
});

function CounterScreen() {
  const [count, actions] = Counter.use();

  return (
    <View>
      <Text>{count}</Text>

      <Button title="+1" onPress={() => actions.increment()} />

      <Button title="Reset" onPress={actions.reset} />
    </View>
  );
}
```

#### Reusable Context Selectors

```tsx
const Data = createContext({
  users: [] as Array<{
    id: string;
    name: string;
    active: boolean;
  }>,
});

const useUsers = Data.use.createSelectorHook((state) => state.users);

const useActiveUsers = useUsers.createSelectorHook((users) => users.filter((user) => user.active));

function ActiveUsers() {
  const users = useActiveUsers();

  return (
    <View>
      {users.map((user) => (
        <Text key={user.id}>{user.name}</Text>
      ))}
    </View>
  );
}
```

#### Testing Context Stores

The Provider can expose its store tools through a wrapper helper.

```tsx
const { wrapper, context } = Counter.Provider.makeProviderWrapper();

// Use `wrapper` with your hook/component test renderer.

// Direct access to the context API:
context.current.actions.increment();

console.log(context.current.getState());
```

#### Lifecycle Hooks

Context stores can react to Provider creation, mount, and cleanup.

```tsx
const Session = createContext(
  {
    user: null,
  },
  {
    callbacks: {
      onCreated(api) {
        console.log("Context created:", api.getState());
      },

      onMounted(api) {
        const unsubscribe = sessionEvents.subscribe((user) => {
          api.setState({ user });
        });

        return unsubscribe;
      },
    },
  },
);
```

---

## Advanced Patterns

### Production Architecture

A larger application can keep each domain store self-contained.

```text
src/stores/todos/
  ├── index.ts
  ├── todos$.ts
  ├── constants/
  │   └── initialValue.ts
  ├── types/
  │   └── Todo.ts
  ├── hooks/
  │   ├── useActiveTodos.ts
  │   └── useCompletedTodos.ts
  └── helpers/
      └── createTodo.ts
```

**`todos$.ts`**

```tsx
import { createGlobalState } from "react-native-global-state-hooks";
import { z } from "zod";
import { initialValue } from "./constants/initialValue";
import { todosState } from "./schema";

const todos$ = createGlobalState(initialValue, {
  asyncStorage: {
    key: "todos",

    validator: ({ restored, initial }) => todosState.parse({ ...initial, ...(restored as object) }),
  },

  actions: {
    addTodo(text: string) {
      return ({ setState }) => {
        setState((state) => ({
          ...state,
          todos: [
            ...state.todos,
            {
              id: `${Date.now()}`,
              text,
              completed: false,
            },
          ],
        }));
      };
    },

    toggleTodo(id: string) {
      return ({ setState }) => {
        setState((state) => ({
          ...state,
          todos: state.todos.map((todo) =>
            todo.id === id
              ? {
                  ...todo,
                  completed: !todo.completed,
                }
              : todo,
          ),
        }));
      };
    },
  },
});

export default todos$;
```

**`hooks/useActiveTodos.ts`**

```tsx
import todos$ from "../todos$";

export const useActiveTodos = todos$.createSelectorHook((state) =>
  state.todos.filter((todo) => !todo.completed),
);
```

**`index.ts`**

```tsx
import todos$ from "./todos$";
import { useActiveTodos } from "./hooks/useActiveTodos";
import { useCompletedTodos } from "./hooks/useCompletedTodos";

export default Object.assign(todos$, {
  useActiveTodos,
  useCompletedTodos,
}); // groups everything into a single name space
```

Usage:

```tsx
import todos$ from "./todos";

function TodoList() {
  const activeTodos = todos$.useActiveTodos();

  return (
    <View>
      {activeTodos.map((todo) => (
        <Text key={todo.id}>{todo.text}</Text>
      ))}
    </View>
  );
}
```

### Smart Subscriptions

Subscribe to only the fragment an integration needs.

```tsx
const useSession = createGlobalState({
  user: null as null | { id: string; role: string },
  isOnline: true,
});

const unsubscribeRole = useSession.subscribe(
  (state) => state.user?.role,
  (role) => {
    analytics.track("role_changed", {
      role,
    });
  },
);

const unsubscribeConnection = useSession.subscribe(
  (state) => state.isOnline,
  (isOnline) => {
    syncEngine.setOnline(isOnline);
  },
);

// Cleanup
unsubscribeRole();
unsubscribeConnection();
```

### App Lifecycle Integration

The non-reactive API is useful when React Native lifecycle events happen outside a screen.

```tsx
import { AppState } from "react-native";

const useAppStatus = createGlobalState({
  active: true,
});

const subscription = AppState.addEventListener("change", (status) => {
  useAppStatus.setState({
    active: status === "active",
  });
});

// Later
subscription.remove();
```

---

## `uniqueId` - Type-Safe Unique IDs

`react-native-global-state-hooks` also exports `uniqueId`.

### Basic Usage

```tsx
import { uniqueId } from "react-native-global-state-hooks";

const id = uniqueId();

console.log(id);
```

Add a prefix:

```tsx
const userId = uniqueId("user:");
const todoId = uniqueId("todo:");
```

### Branded IDs

Create identifiers that TypeScript treats as different domains.

```tsx
import { uniqueId } from "react-native-global-state-hooks";

const userId = uniqueId.for("user:");
const todoId = uniqueId.for("todo:");

type UserId = ReturnType<typeof userId>;
type TodoId = ReturnType<typeof todoId>;
```

Now accidentally mixing identifiers becomes a type error:

```tsx
function openUser(id: UserId) {
  // ...
}

openUser(userId); // ✅
openUser(todoId); // ❌ TypeScript error
```

### Real-World Example

```tsx
type User = {
  id: UserId;
  name: string;
};

type Todo = {
  id: TodoId;
  text: string;
  assignedTo: UserId | null;
};

const useApp = createGlobalState({
  users: [] as User[],
  todos: [] as Todo[],
});
```

---

## Documentation and examples

The [React Global State Hooks website](https://johnny-quesada-developer.github.io/react-global-state-hooks/) is the home for current documentation
and interactive examples.

| Explore | What you will find |
| --- | --- |
| [Getting started](https://johnny-quesada-developer.github.io/react-global-state-hooks/docs/getting-started/) | Create your first store and connect it to your UI. |
| [API and guides](https://johnny-quesada-developer.github.io/react-global-state-hooks/docs/) | Selectors, actions, scoped state, persistence, and TypeScript. |
| [Interactive examples](https://johnny-quesada-developer.github.io/react-global-state-hooks/examples/) | Explore the state model in working browser examples. |
| [Platform guide](https://johnny-quesada-developer.github.io/react-global-state-hooks/docs/platform-and-versions/) | Choose the package and persistence model for your app. |

---

## Choose your package

The family shares a common state API, with persistence tailored to each platform.

| Package | Best fit |
| --- | --- |
| [`react-global-state-hooks`](https://www.npmjs.com/package/react-global-state-hooks) | React web applications with optional localStorage persistence. |
| [`react-native-global-state-hooks`](https://www.npmjs.com/package/react-native-global-state-hooks) | React Native applications with optional asynchronous persistence. |
| [`react-hooks-global-states`](https://www.npmjs.com/package/react-hooks-global-states) | The shared core without platform-specific persistence. |
| [`react-hooks-global-states-debug`](https://www.npmjs.com/package/react-hooks-global-states-debug) | Development instrumentation for the DevTools extension. |

See the [platform guide](https://johnny-quesada-developer.github.io/react-global-state-hooks/docs/platform-and-versions/) for package differences and persistence models.

---

## Built to grow with your application

- **Familiar from the first hook.** Share state through a `useState`-style API.
- **Focused subscriptions.** Select the values a component needs.
- **Composable structure.** Bring in actions, selectors, and scoped stores as your features grow.
- **Persistence where you need it.** Keep selected state in AsyncStorage across app restarts.

---

## Get Started Now

```bash
npm install react-native-global-state-hooks
```

Then in your app:

```tsx
import { Button } from "react-native";
import { createGlobalState } from "react-native-global-state-hooks";

const useTheme = createGlobalState("light");

function App() {
  const [theme, setTheme] = useTheme();
  return <Button title="Toggle Theme" onPress={() => setTheme(theme === "dark" ? "light" : "dark")} />;
}
```

Continue with the [guides and interactive examples](https://johnny-quesada-developer.github.io/react-global-state-hooks/) to build your next store.

---

## Built by Johnny Quesada

Explore the [project website](https://johnny-quesada-developer.github.io/react-global-state-hooks/), meet [Johnny](https://johnny-quesada-developer.github.io/react-global-state-hooks/about/),
and help shape what comes next. If the library helps your work, a GitHub star or a
shared example helps more developers discover it.

[Star on GitHub](https://github.com/johnny-quesada-developer/react-global-state-hooks) · [Report an issue](https://github.com/johnny-quesada-developer/react-global-state-hooks/issues) · [Explore the source](https://github.com/johnny-quesada-developer/react-global-state-hooks/tree/master/libs/mobile)

## Legacy resources

Earlier demos and walkthroughs are preserved here for reference. For current APIs,
examples, and setup instructions, start with the [documentation website](https://johnny-quesada-developer.github.io/react-global-state-hooks/).

- [Original browser demo](https://johnny-quesada-developer.github.io/global-hooks-example/)
- [Original video walkthrough](https://www.youtube.com/watch?v=1UBqXk2MH8I)
- [Original CodePen example](https://codepen.io/johnnynabetes/pen/WNmeGwb?editors=0010)
