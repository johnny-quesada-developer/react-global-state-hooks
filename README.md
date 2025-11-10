# react-global-state-hooks 🌟

![Image John Avatar](https://raw.githubusercontent.com/johnny-quesada-developer/global-hooks-example/main/public/avatar2.jpeg)

Effortless **global state management** for `React` & `React Native` and `Preact`! 🚀 Define a **global state in just one line of code** and enjoy **lightweight, flexible, and scalable** state management. Try it now on **[CodePen](https://codepen.io/johnnynabetes/pen/WNmeGwb?editors=0010)** and see it in action! ✨

---

## 🔗 Explore More

- **[Live Example](https://johnny-quesada-developer.github.io/global-hooks-example/)** 📘
- **[Video Overview](https://www.youtube.com/watch?v=1UBqXk2MH8I/)** 🎥

Works seamlessly with **React & React Native**:

- **[react-global-state-hooks](https://www.npmjs.com/package/react-global-state-hooks)** specific for web applications (**local-storage integration**).
- **[react-native-global-state-hooks](https://www.npmjs.com/package/react-native-global-state-hooks)** specific for React Native projects (**async-storage integration**).

---

## 🛠 Creating a Global State

```tsx
import createGlobalState from 'react-hooks-global-states/createGlobalState';

export const useCount = createGlobalState(0);
```

`useCount` will work as a regular `useState` hook, but the state will persist across your entire app!

```tsx
// Component A
const [count, setCount] = useCount();

return <Button onClick={() => setCount((count) => count + 1)}>{count}</Button>;

// Component B
const [count] = useCount();

return <Text>Count is: {count}</Text>;
```

---

## 🎯 Selectors

For **complex state objects**, you can subscribe to specific properties instead of the entire state:

```tsx
export const useContacts = createGlobalState({ entities: [], selected: new Set<number>() });
```

To access only the `entities` property:

```tsx
const [filter, setFilter] = useContacts((state) => state.filter);
const contacts = useContacts.select((state) => state.entities, [filter]);

return (
  <ul>
    {contacts.map((contact) => (
      <li key={contact.id}>{contact.name}</li>
    ))}
  </ul>
);
```

Alternatively, you can also define the `isEqual` and `isEqualRoot` options to optimize re-selection:

```tsx
const contacts = useContacts.select((state) => state.entities.filter((item) => item.name.includes(filter)), {
  dependencies: [filter],
  isEqual: (a, b) => a.length === b.length,
  isEqualRoot: (a, b) => a.entities === b.entities,
});
```

---

## 🔄 Reusing Selectors

```tsx
export const useContactsArray = useContacts.createSelectorHook((state) => state.entities);
export const useContactsCount = useContactsArray.createSelectorHook((entities) => entities.length);
```

### 📌 Using Selectors in Components

```tsx
const contacts = useContactsArray();
const count = useContactsCount();
```

#### ✅ Inline Selectors

```tsx
const filteredContacts = useContactsArray(
  (contacts) => contacts.filter((c) => c.name.includes(filter)),
  [filter],
);
```

---

## 🗂️ Persisting State with LocalStorage

To persist the global state using **LocalStorage**, simply add the `localStorage` option:

```tsx
const useContacts = createGlobalState(new Map(), {
  localStorage: {
    key: 'contacts',

    // validator is mandatory to prevent corrupted data from populating the state
    validator: ({ restored, initial }) => {
      // validate the restored value
      if (!isMap(restored)) return initial;
      return restored as typeof initial;
    },
  },
});
```

---

## 🎛 State Actions: Controlling State Modifications

Restrict **state modifications** by defining custom actions:

```tsx
const initialValue = {
  filter: '',
  contacts: [] as Array<{ id: number; name: string; email?: string }>,
  status: 'idle' as 'idle' | 'loading' | 'success' | 'error',
};

/** *
 * For complex state, prefer a semantic, declarative store.
 * For example let's add the suffix `$` which is a common convention to denote stores.
 */
export const contacts$ = createGlobalState(initialValue, {
  actions: {
    async fetch() {
      return async ({ setState }) => {
        setState((s) => ({ ...s, status: 'loading' }));

        const contacts = await fetchItems();

        setState((s) => ({ ...s, contacts, status: 'success' }));
      };
    },

    setFilter(filter: string) {
      return ({ setState }) => {
        setState((s) => ({ ...s, filter }));
      };
    },
  },
});
```

Then inside your components, you can use your global hook as a store:

```tsx
// Component A
// Subscribe to changes of the contacts property
const contacts = contacts$.use.select((s) => s.contacts);

// Component B
const onChangeFilter = (newFilter: string) => {
  // Directly use the actions from the store without subscribing to state changes
  contacts$.actions.setFilter(newFilter);
};

// Other examples
const useReusableSelector = contacts$.createSelectorHook((s) => s.filter);
const observable = contacts$.createObservable((s) => `Status is: \${s.status}`);
const metadata = contacts$.getMetadata(); // non-reactive metadata
```

---

## 🌍 Accessing Global State Outside Components

As mentioned earlier, you can use the store actions outside components by directly calling actions and dispatchers from the store.

```tsx
/**
 * contacts$.actions has access to all the defined actions of the store
 * @example:
 */
useEffect(() => {
  contacts$.actions.fetch();
}, []);

console.log(contacts$.getState()); // Retrieves the current state without subscription
```

#### ✅ Subscribe to changes outside components

```tsx
const unsubscribe = contacts$.subscribe((state) => {
  console.log('State updated:', state);
});
```

#### ✅ Subscriptions are great when one state depends on another.

```tsx
const initialValue = null as string | null;

const selectedId$ = createGlobalState(initialValue, {
  callbacks: {
    onInit: ({ setState, getState }) => {
      /**
       * Let's create a subscription to contacts$ to clear the selectedId if the contact is removed
       */
      contacts$.subscribe(
        (state) => state.contacts, // listen only to contacts changes
        (contacts) => {
          const hasContactId = contacts.has(getState());
          if (!hasContactId) setState(null);
        },
      );
    },
  },
});
```

---

## 🎭 Using Context for Scoped State

### 📌 Creating a Context

```tsx
import { createContext } from 'react-global-state-hooks/createContext';

export const counter$ = createContext(0);
```

Wrap your app:

```tsx
<counter$.Provider>
  <MyComponent />
</counter$.Provider>
```

Use the context state:

```tsx
const [count, setCount] = counter$.use();
```

---

## ⚖️ `createGlobalState` vs. `createContext`

| Feature                | `createGlobalState`                      | `createContext`                                                                                                    |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Scope**              | Available globally across the entire app | Scoped to the Provider where it’s used                                                                             |
| **How to Use**         | `const useCount = createGlobalState(0)`  | `const counter$ = createContext(0)`                                                                                |
| **createSelectorHook** | `useCount.createSelectorHook`            | `counter$.createSelectorHook`                                                                                      |
| **inline selectors?**  | ✅ Supported                             | ✅ Supported                                                                                                       |
| **Custom Actions**     | ✅ Supported                             | ✅ Supported                                                                                                       |
| **Observables**        | `useCount.createObservable`              | `counter$ = counter.use.observable()`                                                                              |
| **Best For**           | Global app state (auth, settings, cache) | Scoped module state, reusable component state, or state shared between child components without being fully global |

---

## 🔄 Lifecycle Methods

Global state hooks support lifecycle callbacks for additional control.

```tsx
const useData = createGlobalState(
  { value: 1 },
  {
    callbacks: {
      onInit: ({ setState }) => {
        console.log('Store initialized');
      },
      onStateChanged: ({ state, previousState }) => {
        console.log('State changed:', previousState, '→', state);
      },
      computePreventStateChange: ({ state, previousState }) => {
        return state.value === previousState.value;
      },
    },
  },
);
```

Use **`onInit`** for setup, **`onStateChanged`** to listen to updates, and **`computePreventStateChange`** to prevent unnecessary updates.

---

## Metadata

There is a possibility to add non-reactive information in the global state:

```tsx
const useCount = createGlobalState(0, { metadata: { renders: 0 } });
```

How to use it?

```tsx
const [count, , metadata] = useCount();

metadata.renders += 1;
```

---

## 🚀 React Hooks Global States - DevTools Extension

React Hooks Global States includes a dedicated, `devTools extension` to streamline your development workflow! Easily visualize, inspect, debug, and modify your application's global state in real-time right within your browser.

### 🔗 [Install the DevTools Extension for Chrome](https://chromewebstore.google.com/detail/bafojplmkpejhglhjpibpdhoblickpee/preview?hl=en&authuser=0)

### 📸 DevTools Highlights

| **Track State Changes**                                                                                                               | **Modify the State**                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| ![Track State Changes](https://github.com/johnny-quesada-developer/react-hooks-global-states/raw/main/public/track-state-changes.png) | ![Modify the State](https://github.com/johnny-quesada-developer/react-hooks-global-states/raw/main/public/modify-the-state.png) |
| Effortlessly monitor state updates and history.                                                                                       | Instantly edit global states directly from the extension.                                                                       |

---

| **Restore the State**                                                                                                             | **Custom Actions Granularity**                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![Restore the State](https://github.com/johnny-quesada-developer/react-hooks-global-states/raw/main/public/restore-the-state.png) | ![Custom Actions Granularity](https://github.com/johnny-quesada-developer/react-hooks-global-states/raw/main/public/custom-actions-granularity.png) |
| Quickly revert your application to a previous state.                                                                              | Precisely debug specific actions affecting state changes.                                                                                           |

<br>

## 🎯 Ready to Try It?

📦 **NPM Package:** [react-hooks-global-states](https://www.npmjs.com/package/react-hooks-global-states)

🚀 Simplify your **global state management** in React & React Native today! 🚀
