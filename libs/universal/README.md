# react-hooks-global-states 🌟

![Image John Avatar](https://raw.githubusercontent.com/johnny-quesada-developer/global-hooks-example/main/public/avatar2.jpeg)

<div align="center">

**Zero setup. Zero complexity. Maximum performance.** 🚀

_One line of code. Infinite possibilities._ ✨

[![npm version](https://img.shields.io/npm/v/react-hooks-global-states.svg)](https://www.npmjs.com/package/react-hooks-global-states)
[![Downloads](https://img.shields.io/npm/dm/react-hooks-global-states.svg)](https://www.npmjs.com/package/react-hooks-global-states)
[![License](https://img.shields.io/npm/l/react-hooks-global-states.svg)](https://github.com/johnny-quesada-developer/react-hooks-global-states/blob/main/LICENSE)

[**Live Demo**](https://johnny-quesada-developer.github.io/global-hooks-example/) • [**Video Tutorial**](https://www.youtube.com/watch?v=1UBqXk2MH8I/) • [**CodePen**](https://codepen.io/johnnynabetes/pen/WNmeGwb?editors=0010)

</div>

---

## 🎯 The One-Liner

```tsx
import { createGlobalState } from 'react-hooks-global-states';

export const useCounter = createGlobalState(0);
```

**That's it.** No providers. No context boilerplate. No configuration files. Just pure, beautiful state management. 🎨

```tsx
// Use it anywhere, instantly
function Counter() {
  const [count, setCount] = useCounter();
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

---

## 🚀 Why Developers Love This Library

<table>
<tr>
<td width="50%">

### 🎓 **Zero Learning Curve**

```tsx
// If you know this...
const [state, setState] = useState(0);

// You know this!
const [state, setState] = useGlobalState();
```

</td>
<td width="50%">

### ⚡ **Blazing Fast**

Only components that care about a slice re-render. Surgical precision, maximum performance.

```tsx
// Only re-renders when name changes
const [name] = useStore((s) => s.user.name);
```

</td>
</tr>

<tr>
<td width="50%">

### 🔗 **Chainable Selectors**

```tsx
const useUsers = store.createSelectorHook((s) => s.users);
const useAdmins = useUsers.createSelectorHook((users) => users.filter((u) => u.isAdmin));
```

</td>
<td width="50%">

### 🎭 **Actions (Optional)**

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

</td>
</tr>

<tr>
<td width="50%">

### 🎪 **Context Mode**

```tsx
const Form = createContext({ name: '', email: '' });

<Form.Provider>
  <FormFields />
</Form.Provider>;
```

</td>
<td width="50%">

### � **Non-Reactive API**

Use state anywhere - even outside React components!

```tsx
// In API interceptors, WebSockets, utils...
const token = useAuth.getState().token;
useAuth.setState({ user: newUser });
```

</td>
</tr>
</table>

---

## 📦 Installation

```bash
npm install react-hooks-global-states
```

**Platform-specific with built-in storage:**

- 🌐 **Web**: `react-global-state-hooks` (localStorage)
- 📱 **React Native**: `react-native-global-state-hooks` (AsyncStorage by default, customizable, optional dependency)

---

## 🎬 Quick Start

### 30 Seconds to Global State

```tsx
import { createGlobalState } from 'react-hooks-global-states';

// 1. Create it (anywhere)
const useTheme = createGlobalState('dark');

// 2. Use it (everywhere)
function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  return <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme} mode</button>;
}

function ThemedComponent() {
  const [theme] = useTheme();
  return <div className={theme}>Themed content</div>;
}
```

### 60 Seconds to Production-Ready

```tsx
import { createGlobalState } from 'react-hooks-global-states';

const useAuth = createGlobalState(
  { user: null, token: null },
  {
    // Non-reactive metadata
    metadata: { isLoading: false },

    // Type-safe actions
    actions: {
      login(email, password) {
        return async ({ setState, setMetadata }) => {
          setMetadata({ isLoading: true });
          try {
            const { user, token } = await api.login(email, password);
            setState({ user, token });
            return { success: true };
          } catch (error) {
            return { success: false, error };
          } finally {
            setMetadata({ isLoading: false });
          }
        };
      },

      logout() {
        return ({ setState }) => {
          setState({ user: null, token: null });
        };
      },
    },
  },
);

// Usage
function LoginForm() {
  const [auth, actions] = useAuth();
  const { isLoading } = useAuth.getMetadata();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await actions.login(email, password);
    if (!result.success) toast.error(result.error);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
      <button disabled={isLoading}>{isLoading ? 'Logging in...' : 'Login'}</button>
    </form>
  );
}
```

---

## 🌟 Core Features Deep Dive

### 1️⃣ Global State with `createGlobalState`

Create state that lives outside React's component tree. Perfect for app-wide state!

#### 🎨 The Basics

```tsx
// Primitives
const useCount = createGlobalState(0);
const useTheme = createGlobalState('light');
const useIsOpen = createGlobalState(false);

// Objects
const useUser = createGlobalState({ name: 'Guest', role: 'viewer' });

// Arrays
const useTodos = createGlobalState([
  { id: 1, text: 'Learn this library', done: true },
  { id: 2, text: 'Build something awesome', done: false },
]);

// With function initialization (useful for testing - allows store.reset())
const useExpensiveState = createGlobalState(() => {
  return computeExpensiveInitialValue();
});
```

#### 🎯 Surgical Re-renders with Selectors

The secret sauce: components only re-render when _their specific slice_ changes!

```tsx
const useStore = createGlobalState({
  user: { name: 'John', age: 30, email: 'john@example.com' },
  theme: 'dark',
  notifications: [],
  settings: { sound: true, vibrate: false },
});

// This component ONLY re-renders when user.name changes
function UserName() {
  const [name] = useStore((state) => state.user.name);
  return <h1>{name}</h1>;
}

// Alternative: use.select() when you only need the value (not setState)
function UserNameAlt() {
  const name = useStore.select((state) => state.user.name);
  return <h1>{name}</h1>;
}

// This ONLY re-renders when theme changes
function ThemeSwitcher() {
  const [theme, setStore] = useStore((state) => state.theme);

  const toggleTheme = () => {
    setStore((s) => ({ ...s, theme: theme === 'dark' ? 'light' : 'dark' }));
  };

  return <button onClick={toggleTheme}>{theme}</button>;
}

// This ONLY re-renders when notifications array changes
function NotificationCount() {
  const [notifications] = useStore((state) => state.notifications);
  return <span>{notifications.length}</span>;
}
```

**Performance comparison:**

| Approach        | Re-renders when ANY state changes? |
| --------------- | ---------------------------------- |
| Context (naive) | ✅ YES (performance killer)        |
| This library    | ❌ NO (only selected slices)       |

#### ⚡ Computed Values with Dependencies

Derive values efficiently with automatic recomputation control! - selectors can depend on external state (like `useState`)!

```tsx
const useStore = createGlobalState({
  todos: [
    { id: 1, text: 'Task 1', completed: false, priority: 'high' },
    { id: 2, text: 'Task 2', completed: true, priority: 'low' },
    { id: 3, text: 'Task 3', completed: false, priority: 'high' },
  ],
});

function FilteredTodoList() {
  // These are regular useState - NOT in the global store!
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'completed'
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all' | 'high' | 'low'

  // 🔥 The magic: selector recomputes when EITHER store OR external state changes!
  const [filteredTodos] = useStore(
    (state) => {
      let todos = state.todos;

      // Filter by completion
      if (filter === 'active') todos = todos.filter((t) => !t.completed);
      if (filter === 'completed') todos = todos.filter((t) => t.completed);

      // Filter by priority
      if (priorityFilter !== 'all') {
        todos = todos.filter((t) => t.priority === priorityFilter);
      }

      return todos;
    },
    [filter, priorityFilter], // Recompute when these external dependencies change!
  );

  return (
    <div>
      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
      </select>

      <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
        <option value="all">All Priorities</option>
        <option value="high">High</option>
        <option value="low">Low</option>
      </select>

      <ul>
        {filteredTodos.map((todo) => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </div>
  );
}

// Advanced: use config object with custom equality
function AdvancedFiltered() {
  const [filter, setFilter] = useState('all');

  const [filteredTodos] = useStore(
    (state) =>
      state.todos.filter((t) => (filter === 'all' ? true : t.completed === (filter === 'completed'))),
    {
      dependencies: [filter],
      // Custom equality - only recompute if todos array changed
      isEqualRoot: (prev, next) => prev.todos === next.todos,
    },
  );

  return <ul>{/* ... */}</ul>;
}
```

#### 🔗 Reusable Selector Hooks (The Game Changer!)

Create hooks from hooks! Chain them! Compose them! This is where it gets fun! 🎉

```tsx
const useStore = createGlobalState({
  users: [
    { id: 1, name: 'Alice', role: 'admin', active: true },
    { id: 2, name: 'Bob', role: 'user', active: true },
    { id: 3, name: 'Charlie', role: 'admin', active: false },
  ],
  currentUserId: 1,
});

// Create a reusable hook for users array
const useUsers = useStore.createSelectorHook((state) => state.users);

// Chain it! Create a hook for active users only
const useActiveUsers = useUsers.createSelectorHook((users) => users.filter((u) => u.active));

// Chain it again! Create a hook for active admins
const useActiveAdmins = useActiveUsers.createSelectorHook((users) => users.filter((u) => u.role === 'admin'));

// Create a hook for the current user
const useCurrentUser = useStore.createSelectorHook((state) => {
  return state.users.find((u) => u.id === state.currentUserId);
});

// Now use them anywhere!
function UserStats() {
  const [totalUsers] = useUsers();
  const [activeUsers] = useActiveUsers();
  const [activeAdmins] = useActiveAdmins();

  return (
    <div>
      <p>Total: {totalUsers.length}</p>
      <p>Active: {activeUsers.length}</p>
      <p>Active Admins: {activeAdmins.length}</p>
    </div>
  );
}

function CurrentUserProfile() {
  const [user] = useCurrentUser();
  return <div>{user?.name}</div>;
}

// 🎯 Key insight: All these hooks share the SAME setState!
function AnyComponent() {
  const [, setFromUsers] = useUsers();
  const [, setFromAdmins] = useActiveAdmins();
  const [, setFromStore] = useStore();

  console.log(setFromUsers === setFromAdmins); // true!
  console.log(setFromUsers === setFromStore); // true!
  console.log(setFromUsers === useStore.setState); // true!
}
```

**Why this is powerful:**

| Feature              | Benefit                                    |
| -------------------- | ------------------------------------------ |
| 🎯 **Precision**     | Each hook subscribes to only what it needs |
| 🔗 **Composability** | Build complex selectors from simple ones   |
| ♻️ **Reusability**   | Define once, use everywhere                |
| 🎨 **Clean Code**    | No repetitive selector logic in components |
| ⚡ **Performance**   | Automatic memoization and change detection |

#### 🎬 Actions - When You Need Structure

Actions aren't required, but they're awesome for organizing mutations!

```tsx
const useStore = createGlobalState(
  {
    todos: new Map(), // Map<id, todo>
    filter: 'all',
  },
  {
    actions: {
      addTodo(text) {
        return ({ setState, getState }) => {
          const id = Date.now();
          const newTodo = { id, text, completed: false };

          setState((s) => ({
            ...s,
            todos: new Map(s.todos).set(id, newTodo),
          }));
        };
      },

      toggleTodo(id) {
        return ({ setState, getState }) => {
          const { todos } = getState();
          const todo = todos.get(id);
          if (!todo) return;

          setState((s) => ({
            ...s,
            todos: new Map(s.todos).set(id, { ...todo, completed: !todo.completed }),
          }));
        };
      },

      clearCompleted() {
        return ({ setState, getState }) => {
          const { todos } = getState();

          // Filter out completed todos, create new Map
          const newTodos = new Map();
          todos.forEach((todo, id) => {
            if (!todo.completed) newTodos.set(id, todo);
          });

          setState((s) => ({ ...s, todos: newTodos }));

          // Actions can call other actions!
          this.updateStats();
        };
      },

      updateStats() {
        return ({ getState }) => {
          const { todos } = getState();
          const completed = Array.from(todos.values()).filter((t) => t.completed).length;
          console.log(`${completed} completed`);
        };
      },

      // Async actions? No problem!
      syncWithServer() {
        return async ({ setState }) => {
          const todosArray = await api.fetchTodos();
          const todosMap = new Map(todosArray.map((t) => [t.id, t]));
          setState((s) => ({ ...s, todos: todosMap }));
        };
      },
    },
  },
);

// When actions are defined, the second element is the actions object!
function TodoApp() {
  const [state, actions] = useStore();

  return (
    <div>
      <button onClick={() => actions.addTodo('New task')}>Add</button>
      <button onClick={() => actions.clearCompleted()}>Clear</button>
      <button onClick={() => actions.syncWithServer()}>Sync</button>

      {Array.from(state.todos.values()).map((todo) => (
        <div key={todo.id} onClick={() => actions.toggleTodo(todo.id)}>
          {todo.text}
        </div>
      ))}
    </div>
  );
}

// � Don't worry, you can still go rogue with setState!
const handleQuickFix = () => {
  useStore.setState((s) => ({ ...s, filter: 'all' }));
};
```

#### 🔌 Non-Reactive API (Use Outside React!)

Access your state from _anywhere_ - even outside components!

```tsx
const useAuth = createGlobalState({ user: null, token: null });

// ✨ In a utility file
export async function loginUser(email, password) {
  try {
    const { user, token } = await api.login(email, password);
    useAuth.setState({ user, token });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

// ✨ In an API interceptor
axios.interceptors.request.use((config) => {
  const { token } = useAuth.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✨ In a WebSocket handler
socket.on('user-updated', (user) => {
  useAuth.setState((state) => ({ ...state, user }));
});

// ✨ Subscribe to changes (even outside React!)
const unsubscribe = useAuth.subscribe(
  // Selector
  (state) => state.user,
  // Callback
  function onChange(newUser) {
    console.log('User changed:', user);
    analytics.identify(user?.id);
  },
);
```

#### 🔭 Observable Fragments (RxJS-style)

Create observable slices of your state for reactive programming!

```tsx
const useStore = createGlobalState({
  count: 0,
  user: { name: 'John' },
});

// Create an observable that tracks just the count
const countObservable = useStore.createObservable((state) => state.count);

// Use it outside React
countObservable.subscribe((count) => {
  console.log('Count is now:', count);
  if (count > 10) {
    alert('Count is high!');
  }
});

// Observables also have getState
console.log(countObservable.getState()); // Current count value

// Chain observables!
const doubledObservable = countObservable.createObservable((count) => count * 2);
```

#### 📋 Metadata - Non-Reactive Side Info

Store data that doesn't need to trigger re-renders!

```tsx
const useStore = createGlobalState(
  { items: [] },
  {
    metadata: {
      isLoading: false,
      lastFetch: null,
      error: null,
      retryCount: 0,
    },
  },
);

// Metadata changes don't trigger re-renders!
useStore.setMetadata({ isLoading: true });

// But you can access it anytime
const meta = useStore.getMetadata();
console.log(meta.isLoading); // true

// Perfect for loading states, error tracking, etc.
async function fetchData() {
  useStore.setMetadata({ isLoading: true, error: null });

  try {
    const items = await api.fetch();
    useStore.setState({ items });
    useStore.setMetadata({
      isLoading: false,
      lastFetch: new Date(),
    });
  } catch (error) {
    useStore.setMetadata({
      isLoading: false,
      error: error.message,
      retryCount: useStore.getMetadata().retryCount + 1,
    });
  }
}
```

---

### 2️⃣ Scoped State with `createContext`

Sometimes you need state scoped to a component tree. That's what `createContext` is for!

#### 🎪 The Basics

```tsx
import { createContext } from 'react-hooks-global-states';

// Create a context
const UserFormContext = createContext({
  name: '',
  email: '',
  age: 0,
});

function App() {
  return (
    <UserFormContext.Provider>
      <FormFields />
      <FormPreview />
    </UserFormContext.Provider>
  );
}

function FormFields() {
  const [form, setForm] = UserFormContext.use();

  return (
    <div>
      <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
    </div>
  );
}

function FormPreview() {
  const [form] = UserFormContext.use();
  return (
    <div>
      Hello {form.name} ({form.email})
    </div>
  );
}
```

#### 🎁 Provider Variations

```tsx
const ThemeContext = createContext('light');

function App() {
  return (
    <>
      {/* Default value */}
      <ThemeContext.Provider>
        <Page /> {/* Gets 'light' */}
      </ThemeContext.Provider>

      {/* Custom value */}
      <ThemeContext.Provider value="dark">
        <Page /> {/* Gets 'dark' */}
      </ThemeContext.Provider>

      {/* Derived from parent (yes, you can nest!) */}
      <ThemeContext.Provider value={(parent) => (parent === 'dark' ? 'light' : 'dark')}>
        <Page /> {/* Gets opposite of parent */}
      </ThemeContext.Provider>
    </>
  );
}
```

#### 🎯 Context + Selectors = ❤️

Everything that works with `createGlobalState` works with `createContext`!

```tsx
const FormContext = createContext({
  personal: { name: '', age: 0 },
  contact: { email: '', phone: '' },
  preferences: { theme: 'light', notifications: true },
});

// Only re-renders when name changes!
function NameField() {
  const [name, setForm] = FormContext.use((state) => state.personal.name);
  return (
    <input
      value={name}
      onChange={(e) => setForm((s) => ({ ...s, personal: { ...s.personal, name: e.target.value } }))}
    />
  );
}

// Only re-renders when email changes!
function EmailField() {
  const [email] = FormContext.use((state) => state.contact.email);
  return <div>{email}</div>;
}
```

#### 🎭 Context with Actions

```tsx
const CounterContext = createContext(0, {
  actions: {
    increment(amount = 1) {
      return ({ setState, getState }) => {
        setState(getState() + amount);
      };
    },
    decrement(amount = 1) {
      return ({ setState, getState }) => {
        setState(getState() - amount);
      };
    },
    reset() {
      return ({ setState }) => setState(0);
    },
  },
});

function Counter() {
  const [count, actions] = CounterContext.use();

  return (
    <div>
      <h1>{count}</h1>
      <button onClick={() => actions.increment()}>+</button>
      <button onClick={() => actions.decrement()}>-</button>
      <button onClick={() => actions.reset()}>Reset</button>
    </div>
  );
}

function App() {
  return (
    <CounterContext.Provider>
      <Counter />
    </CounterContext.Provider>
  );
}
```

#### 🔗 Reusable Context Selectors

Yes, chainable selectors work here too!

```tsx
const DataContext = createContext({
  users: [
    /* ... */
  ],
  posts: [
    /* ... */
  ],
  filter: 'all',
});

// Create reusable hooks
const useUsers = DataContext.use.createSelectorHook((s) => s.users);
const useActiveUsers = useUsers.createSelectorHook((u) => u.filter((user) => user.active));
const usePosts = DataContext.use.createSelectorHook((s) => s.posts);

function App() {
  return (
    <DataContext.Provider>
      <UserList />
      <PostList />
    </DataContext.Provider>
  );
}

function UserList() {
  const [activeUsers] = useActiveUsers();
  return (
    <ul>
      {activeUsers.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  );
}
```

#### 🧪 What About Testing?

Do you need to access the context to spy on state changes, inject test data, or manipulate state directly? No problem!

```tsx
import { renderHook } from '@testing-library/react';
import CounterContext from './CounterContext'; // { count: 0 } with increment() action

describe('CounterContext', () => {
  it('should manipulate state from tests', () => {
    // Create wrapper with direct access to context
    const { wrapper, context } = CounterContext.Provider.makeProviderWrapper();

    // Render the hook
    const { result } = renderHook(() => CounterContext.use(), { wrapper });

    // Read initial state
    expect(result.current[0].count).toBe(0);

    // Call the action through the wrapper
    context.current.actions.increment();

    // Verify state updated
    expect(result.current[0].count).toBe(1);
  });
});
```

#### 🎬 Lifecycle Hooks

React to context lifecycle events!

```tsx
const DataContext = createContext([], {
  callbacks: {
    onCreated: (store) => {
      console.log('Context created with:', store.getState());
    },
    onMounted: (store) => {
      console.log('Provider mounted!');

      // Fetch data on mount
      fetchData().then((data) => store.setState(data));

      // Return cleanup
      return () => {
        console.log('Provider unmounting!');
      };
    },
    onRender: (store) => {
      console.log('Provider rendered!');
    },
  },
});

// Or per-provider
function App() {
  return (
    <DataContext.Provider
      onCreated={(store) => console.log('Created!')}
      onMounted={(store) => {
        console.log('Mounted!');
        return () => console.log('Cleanup!');
      }}
      onRender={(store) => console.log('Executes on every provider render!')}
    >
      <Content />
    </DataContext.Provider>
  );
}
```

---

### 3️⃣ External Actions with `actions`

Extend any store with additional actions without modifying it! Perfect for separating concerns! 🎯

#### 💪 Direct Binding

```tsx
import { createGlobalState, actions } from 'react-hooks-global-states';

const useCounter = createGlobalState(0);

// Create actions for the store
const counterActions = actions(useCounter, {
  increment(amount = 1) {
    return ({ setState, getState }) => {
      setState(getState() + amount);
    };
  },

  decrement(amount = 1) {
    return ({ setState, getState }) => {
      setState(getState() - amount);
    };
  },

  double() {
    return ({ setState, getState }) => {
      setState(getState() * 2);
    };
  },
});

// Use them anywhere!
counterActions.increment(5); // count = 5
counterActions.double(); // count = 10
counterActions.decrement(3); // count = 7
```

#### 🎨 Action Templates (Define Before Ready!)

Need actions in contexts or lifecycle hooks (onInit) before the store API is available? Create action templates first, bind them later!

```tsx
import { actions, InferAPI, createContext } from 'react-hooks-global-states';

type SessionAPI = InferAPI<typeof SessionContext>;

// Create internal actions template
const internalActions = actions<SessionAPI>()({
  loadData() {
    return async ({ setState }) => {
      ...
    };
  },
});

const SessionContext = createContext(
  { user: null, preferences: {}, lastSync: null },
  {
    callbacks: {
      onInit: (api) => {
        const { loadData } = internalActions(api);

        // Load data on init
        loadData();

        // Sync every 5 minutes
        const interval = setInterval(loadData, 5 * 60 * 1000);

        // Cleanup on unmount
        return () => clearInterval(interval);
      },
    },

    // public actions
    actions: {
      logout() {
        return (api) => {
          const { setState } = api as SessionAPI;
          setState({ user: null, preferences: {}, lastSync: null });
        };
      },
    },
  },
);

// Internal actions are not expose through the context
const { loadData } = SessionContext.use.actions();
console.log(loadData); // undefined
```

#### 🔄 Actions Calling Actions

Actions can call each other in multiple ways!

```tsx
const useStore = createGlobalState({ count: 0, history: [] }, {
  actions: {
    clearHistory() {
      return ({ setState }) => {
        ...
      };
    },
  },
});

const storeActions = actions(useStore, {
  logAction(message) {
    return ({ setState, getState }) => {
      ...
    };
  },

  increment(amount = 1) {
    return ({ setState, getState }) => {
      setState((s) => ({ ...s, count: s.count + amount }));

      // Call another action in this group with 'this'
      this.logAction(`Incremented by ${amount}`);
    };
  },

  incrementTwice(amount = 1) {
    return ({ actions }) => {
      // Call actions with 'this'
      this.increment(amount);
      this.increment(amount);

      // Or directly from storeActions
      storeActions.logAction(`Incremented twice by ${amount}`);

      // Access store's public actions via 'actions' parameter
      actions.clearHistory();
    };
  },
});

storeActions.incrementTwice(5);
```

#### 🎭 Access Store Actions

External actions can call each other with `this` and access the store's public actions!

```tsx
const useStore = createGlobalState(
  { count: 0, logs: [] },
  {
    actions: {
      log(message) {
        return ({ setState }) => {
          ...
        };
      },
    },
  },
);

const extraActions = actions(useStore, {
  addToHistory(message) {
    return ({ setState }) => {
      ...
    };
  },

  incrementAndLog(amount = 1) {
    return ({ setState, actions }) => {
      setState((s) => ({ ...s, count: s.count + amount }));

      // Call sibling actions with 'this'
      this.addToHistory(`Incremented by ${amount}`);

      // Access store's public actions
      actions.log(`Count increased by ${amount}`);
    };
  },
});

extraActions.incrementAndLog(5);
```

#### 🎪 Works with Context!

```tsx
import { actions, InferAPI } from 'react-hooks-global-states';

const CounterContext = createContext(0);

type CounterAPI = InferAPI<typeof CounterContext>;

// Define action template outside - reusable domain actions
const counterActionsTemplate = actions<CounterAPI>()({
  increment() {
    return ({ setState, getState }) => {
      setState(getState() + 1);
    };
  },

  decrement() {
    return ({ setState, getState }) => {
      setState(getState() - 1);
    };
  },
});

function App() {
  return (
    <CounterContext.Provider>
      <Counter />
    </CounterContext.Provider>
  );
}

function Counter() {
  const api = CounterContext.use.api();

  // Bind template to context instance
  const { increment, decrement } = useMemo(() => counterActionsTemplate(api), [api]);

  return (
    <div>
      <button onClick={increment}>+1</button>
      <button onClick={decrement}>-1</button>
    </div>
  );
}
```

---

## 🔥 Advanced Patterns

### 🏗️ Production Architecture (File Organization)

Real-world large-scale applications need clean separation! Here's how to organize a store with actions in separate files, custom hooks, observables, and a namespace pattern:

**File Structure:**

```
src/stores/todos/
  ├── index.ts              // Namespace - bundles everything
  ├── store.ts              // Store definition
  ├── constants/            // Initial state & metadata
  │   ├── initialValue.ts
  │   └── metadata.ts
  ├── types/                // Type definitions
  │   ├── TodosAPI.ts
  │   └── Todo.ts
  ├── hooks/                // Custom selector hooks
  │   ├── useActiveTodos.ts
  │   └── useCompletedTodos.ts
  ├── observables/          // Observable fragments
  │   └── activeTodos$.ts
  ├── helpers/              // Utility functions
  │   └── createTodo.ts
  └── actions/
      ├── index.ts          // Export all actions
      ├── addTodo.ts
      ├── toggleTodo.ts
      └── internal/
          └── syncWithServer.ts
```

**Store Definition (`store.ts`):**

```tsx
import { createGlobalState, actions, type InferAPI } from 'react-hooks-global-states';
import { addTodo, toggleTodo, removeTodo } from './actions';
import { syncWithServer } from './actions/internal';
import { initialValue, metadata } from './constants';

type TodosAPI = InferAPI<typeof todosStore>;

// Internal actions template
const internalActions = actions<TodosAPI>()({
  syncWithServer,
});

const todosStore = createGlobalState(initialValue, {
  metadata,

  // Public actions - exposed to consumers
  actions: {
    addTodo,
    toggleTodo,
    removeTodo,
  },

  callbacks: {
    onInit: (api) => {
      // Bind and extend with internal actions (not exposed publicly)
      const { syncWithServer } = internalActions(api);

      // Auto-sync every 30 seconds
      const interval = setInterval(() => syncWithServer(), 30000);
      return () => clearInterval(interval);
    },
  },
});

// Export types (defined in types/ folder)
export type { TodosAPI } from './types';

export default todosStore;
```

**Type Files (`types/TodosAPI.ts`):**

```tsx
// types/TodosAPI.ts
// prevents circular type references
export type TodosAPI = import('../store').TodosAPI;
```

**Action File (`actions/addTodo.ts`):**

```tsx
import type { TodosAPI } from '../types';

/**
 * Adds a new todo and syncs with server
 */
function addTodo(this: TodosAPI['actions'], text: string) {
  return async ({ setState }: TodosAPI): Promise<void> => {
    const newTodo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: new Date(),
    };

    setState((s) => ({
      ...s,
      todos: [...s.todos, newTodo],
    }));

    // Call internal action to sync
    await this.syncWithServer();
  };
}

export default addTodo;
```

**Custom Hook (`hooks/useActiveTodos.ts`):**

```tsx
import todosStore from '../store';

export const useActiveTodos = todosStore.createSelectorHook((state) =>
  state.todos.filter((t) => !t.completed),
);
```

**Observable (`observables/activeTodos$.ts`):**

```tsx
import { useActiveTodos } from '../hooks/useActiveTodos';

// Derive from hook - reuses the filter logic
export const activeTodos$ = useActiveTodos.createObservable((s) => s);
```

**Namespace Pattern (`index.ts`):**

```tsx
import store from './store';
import { useActiveTodos, useCompletedTodos } from './hooks';
import { activeTodos$, completedTodos$ } from './observables';

// Bundle everything into a clean namespace
const todos$ = Object.assign(store, {
  // Custom hooks
  useActiveTodos,
  useCompletedTodos,

  // Observables
  activeTodos$,
  completedTodos$,
});

export default todos$;
```

**Usage:**

```tsx
import todos$ from './stores/todos';

function TodoApp() {
  // Use the namespace
  const activeTodos = todos$.useActiveTodos();

  // Subscribe to observable outside React
  useEffect(() => {
    const sub = todos$.activeTodos$.subscribe((todos) => {
      console.log('Active todos changed:', todos.length);
    });
    return () => sub();
  }, []);

  return (
    <div>
      <button onClick={() => todos$.actions.addTodo('New task')}>Add</button>
      {activeTodos.map((todo) => (
        <div key={todo.id}>{todo.text}</div>
      ))}
    </div>
  );
}
```

**Why this pattern rocks:**

- ✅ **KISS** - Keep It Simple, Stupid! Easy to navigate
- ✅ **Type-safe** - Everything is strongly typed
- ✅ **Public/Private APIs** - Internal actions don't pollute public interface
- ✅ **Namespace pattern** - Everything bundled: `todos$.useActiveTodos()`, `todos$.activeTodos$`
- ✅ **Scalable** - Easy to find, test, and maintain individual pieces

### 🎧 Smart Subscriptions

Subscribe to specific slices outside React!

```tsx
const useStore = createGlobalState({
  user: { name: 'John', role: 'admin' },
  theme: 'dark',
  notifications: [],
});

// Subscribe to just the theme
const unsubTheme = useStore.subscribe(
  (state) => state.theme,
  (theme) => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  },
);

// Subscribe to user role changes
const unsubRole = useStore.subscribe(
  (state) => state.user.role,
  (role) => {
    console.log('User role changed to:', role);
    analytics.track('role_changed', { role });
  },
);

// Cleanup
unsubTheme();
unsubRole();
```

---

## 🎨 `uniqueId` - Type-Safe Unique IDs

Generate branded unique identifiers with compile-time safety!

### 🏷️ Basic Usage

```tsx
import { uniqueId } from 'react-hooks-global-states';

// Simple IDs
const id1 = uniqueId(); // "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
const id2 = uniqueId('user:'); // "user:a1b2c3d4-e5f6-7890-abcd-ef1234567890"
const id3 = uniqueId('session:'); // "session:a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### 🔒 Branded IDs (Type Safety!)

Create ID generators with compile-time type checking!

```tsx
// Create branded generators
const generateUserId = uniqueId.for('user:');
const generatePostId = uniqueId.for('post:');

type UserId = ReturnType<typeof generateUserId>;
type PostId = ReturnType<typeof generatePostId>;

const userId: UserId = generateUserId(); // ✅ "user:a1b2c3d4-e5f6-7890-abcd-ef1234567890"
const postId: PostId = generatePostId(); // ✅ "post:a1b2c3d4-e5f6-7890-abcd-ef1234567890"

// TypeScript prevents mixing!
const wrong: UserId = generatePostId(); // ❌ Type error!
```

### 🛡️ Runtime Validation

```tsx
const generateUserId = uniqueId.for('user:');

const id = generateUserId(); // "user:a1b2c3d4-e5f6-7890-abcd-ef1234567890"

// Check if a string is a valid user ID
if (generateUserId.is(id)) {
  console.log('Valid user ID!');
}

generateUserId.is('user:a1b2c3d4-e5f6-7890-abcd-ef1234567890'); // ✅ true
generateUserId.is('post:a1b2c3d4-e5f6-7890-abcd-ef1234567890'); // ❌ false

// Assert (throws if invalid)
generateUserId.assert('user:a1b2c3d4-e5f6-7890-abcd-ef1234567890'); // ✅ OK
generateUserId.assert('post:a1b2c3d4-e5f6-7890-abcd-ef1234567890'); // ❌ Throws error!
```

### 🎯 Strict Branding

Maximum type safety with symbol branding!

```tsx
declare const UserBrand: unique symbol;
declare const PostBrand: unique symbol;

const generateUserId = uniqueId.for('user:').strict<typeof UserBrand>();
const generatePostId = uniqueId.for('post:').strict<typeof PostBrand>();

// Even with same prefix, types are incompatible!
const generateUserId2 = uniqueId.for('user:').strict<typeof PostBrand>();

type UserId = ReturnType<typeof generateUserId>;
type UserId2 = ReturnType<typeof generateUserId2>;

const id1: UserId = generateUserId(); // ✅
const id2: UserId = generateUserId2(); // ❌ Different brands!
```

### 💼 Real-World Example

```tsx
import { createGlobalState, uniqueId } from 'react-hooks-global-states';

// Create typed ID generators
const generateUserId = uniqueId.for('user:');
const generateTodoId = uniqueId.for('todo:');

type UserId = ReturnType<typeof generateUserId>;
type TodoId = ReturnType<typeof generateTodoId>;

interface User {
  id: UserId;
  name: string;
}

interface Todo {
  id: TodoId;
  text: string;
  assignedTo: UserId | null;
}

const useApp = createGlobalState(
  {
    users: [] as User[],
    todos: [] as Todo[],
  },
  {
    actions: {
      addUser(name: string) {
        return ({ setState, getState }) => {
          const user: User = {
            id: generateUserId(), // Type-safe!
            name,
          };
          setState((s) => ({
            ...s,
            users: [...s.users, user],
          }));
        };
      },

      addTodo(text: string, assignedTo: UserId | null = null) {
        return ({ setState, getState }) => {
          const todo: Todo = {
            id: generateTodoId(), // Type-safe!
            text,
            assignedTo,
          };
          setState((s) => ({
            ...s,
            todos: [...s.todos, todo],
          }));
        };
      },

      assignTodo(todoId: TodoId, userId: UserId) {
        return ({ setState, getState }) => {
          // TypeScript ensures correct ID types!
          setState((s) => ({
            ...s,
            todos: s.todos.map((t) => (t.id === todoId ? { ...t, assignedTo: userId } : t)),
          }));
        };
      },
    },
  },
);

// Usage
const [, actions] = useApp();

// Create a new user
const userId = generateUserId();

actions.addUser('John');
actions.addTodo('Build feature', userId);
```

---

## 🎓 Learning Resources

| Resource                                                                             | Description                       |
| ------------------------------------------------------------------------------------ | --------------------------------- |
| 🎮 [**Live Demo**](https://johnny-quesada-developer.github.io/global-hooks-example/) | Interactive examples              |
| 🎥 [**Video Tutorial**](https://www.youtube.com/watch?v=1UBqXk2MH8I/)                | Full walkthrough                  |
| 💻 [**CodePen**](https://codepen.io/johnnynabetes/pen/WNmeGwb?editors=0010)          | Try it online                     |
| 📚 **400+ Tests**                                                                    | Check the test suite for patterns |

---

## 🌐 Platform-Specific Versions

| Package                                                                                            | Platform             | Special Feature          |
| -------------------------------------------------------------------------------------------------- | -------------------- | ------------------------ |
| [`react-hooks-global-states`](https://www.npmjs.com/package/react-hooks-global-states)             | React / React Native | Core library             |
| [`react-global-state-hooks`](https://www.npmjs.com/package/react-global-state-hooks)               | Web                  | localStorage integration |
| [`react-native-global-state-hooks`](https://www.npmjs.com/package/react-native-global-state-hooks) | React Native         | AsyncStorage integration |

---

## 🎉 Why Developers Choose This

```tsx
"I replaced 500 lines of Redux with 50 lines of this. Mind blown." 🤯
  - Every developer who tries it

"The useState I always wanted." ❤️
  - React developers everywhere

"Finally, state management that doesn't fight me." 🥊
  - Tired developers worldwide
```

### The Bottom Line

| What You Get                | What You Don't        |
| --------------------------- | --------------------- |
| ✅ `useState` API           | ❌ Boilerplate        |
| ✅ Surgical re-renders      | ❌ Whole-tree updates |
| ✅ Chainable selectors      | ❌ Repetitive code    |
| ✅ TypeScript inference     | ❌ Manual typing      |
| ✅ Global + Context         | ❌ Either/or choice   |
| ✅ Actions (optional)       | ❌ Required structure |
| ✅ 30-second learning curve | ❌ Week-long training |

---

## 🚀 Get Started Now

```bash
npm install react-hooks-global-states
```

Then in your app:

```tsx
import { createGlobalState } from 'react-hooks-global-states';

const useTheme = createGlobalState('light');

function App() {
  const [theme, setTheme] = useTheme();
  return <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Toggle Theme</button>;
}
```

**That's it. You're done.** 🎉

---

<div align="center">

### Built with ❤️ for developers who value simplicity

**[⭐ Star on GitHub](https://github.com/johnny-quesada-developer/react-hooks-global-states)** • **[📝 Report Issues](https://github.com/johnny-quesada-developer/react-hooks-global-states/issues)** • **[💬 Discussions](https://github.com/johnny-quesada-developer/react-hooks-global-states/discussions)**

</div>
