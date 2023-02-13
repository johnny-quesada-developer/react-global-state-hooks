# react-global-state-hooks

This is a package to easily handling global-state across your react components

This utility uses the **useState** hook within a subscription pattern and **HOFs** to create a more intuitive, atomic and easy way of sharing state between components

...

...

# Creating a global store

We are gonna create a global count example **useCountGlobal.ts**:

```ts
import { GlobalStore } from 'react-global-state-hooks';

// initialize your store with the default value of the same.
const countStore = new GlobalStore(0);

// get the hook
export const useCountGlobal = countStore.getHook();

// inside your component just call...
const [count, setCount] = useCountGlobal(); // no paremeters are needed since this is a global store

// That's it, that's a global store... Strongly typed, with a global-hook that we could reuse cross all our react-components.

// #### Optionally you are able to use a decoupled hook,
// #### This function is linked to the store hooks but is not a hook himself.

export const [getCount, sendCount] = countStore.getHookDecoupled();

// @example
console.log(getCount()); // 0;

// components subscribed to the global hook if there are so
sendCount(5);

console.log(getCount()); // 5;
```

...

...

# Implementing your global hook into your components

Let's say we have two components **MyFirstComponent**, **MySecondComponent**, in order to use our global hook they will look just like:

```JSX
import { useCountGlobal } from './useCountGlobal'

const MyFirstComponent: React.FC = () => {
  const [count, setter] = useCountGlobal();
  const onClickAddOne = () => setter(count + 1);

  return (<button onClick={onClickAddOne}>{`count: ${count}`}</button>);
}

const MySecondComponent: React.FC = () => {
  const [count, setter] = useCountGlobal();

  // it can also be use as a normal setter into a callback or other hooks
  const onClickAddTwo = useCallback(() => setter(state => state + 2), [])

  return (<button onClick={onClickAddOne}>{`count: ${count}`}</button>);
}

// It's so simple to share information between components
```

Note that the only difference between this and the default **useState** hook is that you are not adding the initial value, cause you already did that when you created the store:

```ts
const countStore = new GlobalStore(0);
```

...

...

# Persisting state into localhost

if you want to persist the value of the store into the. **localstorage**, you only have to add the property **localStorageKey** into the configuration parameter.

```ts
const countStore = new GlobalStore(0, {
  localStorageKey: 'my_persisted_state',

  // by default, the state is encrypted to base64, but you can disable it, or use a custom encryptor
  encrypt: false,

  // by default, the state is encrypted to base64, but you can disable it, or use a custom decrypt
  decrypt: false,
});
```

...

...

# Decoupled hook

If you want to access the global state outside a component or outside a hook, or without subscribing the component to the state changes...

This is especially useful when you want to create components that have edition access to a certain store, but they actually don't need to be reactive to the state changes, like a search component that just need to get the current state every time that is going to search the data; but actually don't need to be subscribed to the changes over the collection he is going to be filtering.

```ts
import { GlobalStore } from 'react-global-state-hooks';

const countStore = new GlobalStore(0);

// remember this should be used as the **useState** hook.
export const useCountGlobal = countStore.getHook();

// this functions are not hooks, and they can be used in whatever place into your code, ClassComponents, OtherHooks, Services etc.
export const [getCount, sendCount] = countStore.getHookDecoupled();
```

Let's see a trivial example:

...

```JSX
import { useCountGlobal, sendCount } from './useCountGlobal'

const CountDisplayerComponent: React.FC = () => {
  const [count] = useCountGlobal();

  return (<Text>{count}<Text/>);
}

// here we have a separate component that is gonna handle the state of the previous component we created,
// this new component is not gonna be affected by the changes applied on <CountDisplayerComponent/>
// Stage2 does not need to be updated once the global count changes
const CountManagerComponent: React.FC = () => {
  const increaseClick = useCallback(() => sendCount(count => count + 1), []);
  const decreaseClick = useCallback(() => sendCount(count => count - 1), []);

  return (<>
      <button onClick={increaseClick} >increase</button>
      <button onClick={decreaseClick} >decrease</button>
    </>);
}
```

...

...

# Restricting the manipulation of the global **state**

## Who hate reducers?

It's super common to have the wish or the necessity of restricting the manipulation of the **state** through a specific set of actions or manipulations...**Dispatches**? **Actions**? Let's make it simple BY adding a custom **API** to the configuration of our **GlobalStore**
...

```ts
const initialValue = 0;

const config = {
  // this is not reactive information that you could also store in the async storage
  // upating the metadata will not trigger the onStateChanged method or any update on the components
  metadata: null,

  // The lifecycle callbacks are: onInit, onStateChanged, onSubscribed and computePreventStateChange
};

const countStore = new GlobalStore(
  initialValue,
  config,
  {
    log: (message: string) => (): void => {
      console.log(message);
    },

    increase(message: string) {
      return (storeTools: StoreTools<number>) => {
        this.log(message);

        return storeTools.getState();
      };
    },

    decrease(message: string) {
      return (storeTools: StoreTools<number>) => {
        this.log(message);

        return storeTools.getState();
      };
    },
  } as const // the -as const- is necessary to avoid typescript errors
);

// the way to get the hook is the same as for simple setters
const useCountStore = countStore.getHook();

// now instead of a setState method, you'll get an actions object
// that contains all the actions that you defined in the setterConfig
const [count, countActions] = useCountStore();

// count is the current state - 0 (number)
// countActions is an object that contains all the actions that you defined in the setterConfig
// countActions.increase(); // this will increase the count by 1, returns the new count (number)
// countActions.decrease(); // this will decrease the count by 1, returns the new count (number)
```

...

# Configuration callbacks

## config.onInit

This method will be called once the store is created after the constructor,

@examples

```ts
import { GlobalStore } from 'react-global-state-hooks';

const initialValue = 0;

const store = new GlobalStore(0, {
  onInit: async ({ setMetadata, setState }) => {
    const data = await someApiCall();

    setState(data);
    setMetadata({ isDataUpdated: true });
  },
});
```

...

## config.onStateChanged

This method will be called every time the state is changed

@examples

```ts
import { GlobalStore } from 'react-global-state-hooks';

const store = new GlobalStore(0, {
  onStateChanged: ({ getState }) => {
    const state = getState();

    console.log(state);
  },
});
```

...

## config.onSubscribed

This method will be called every time a component is subscribed to the store

@examples

```ts
import { GlobalStore } from 'react-global-state-hooks';

const store = new GlobalStore(0, {
  onSubscribed: ({ getState }) => {
    console.log('A component was subscribed to the store');
  },
});
```

...

## config.computePreventStateChange

This method will be called every time the state is going to be changed, if it returns true the state won't be changed

@examples

```ts
import { GlobalStore } from 'react-global-state-hooks';

const store = new GlobalStore(0, {
  computePreventStateChange: ({ getState }) => {
    const state = getState();
    const shouldPrevent = state < 0;

    if (shouldPrevent) return true;

    return false;
  },
});
```

...

...

...

...

...
