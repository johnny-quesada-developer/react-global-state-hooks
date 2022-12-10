# react-global-state-hooks
This is a package to easily handling global-state across your react-native-components **No-redux**, **No-context**

This utility follows the same style as the default **useState** hook, with a subscription pattern and **HOFs** to create a more intuitive, atomic and easy way of sharing state between components

## Creating a global store, an a simple hook

We are gonna create a global count example **count.ts**:

```JSX
// Import the store costructor
import GlobalStore from 'react-global-state-hooks';

// initialize your store with the default value of the same.
const countStore = new GlobalStore(0);

// you'll use this function the same way you'll use the **useState**
export const useCountGlobal = countStore.getHook();

// That's it, that's a global store... Strongly typed, with a global-hook that we could reuse cross all our react-components.
```

## Implementing your global hook into your components
Let's say we have two components **MyFirstComponent**, **MySecondComponent**, in order to use our global hook they will look just like: 

```JSX
import { useCountGlobal } from './count'

const MyFirstComponent: React.FC = () => {
  const [count, setter] = useCountGlobal();
  const onClick = useCallback(() => setter(currentState => currentState + 1), []);

  return (<button onclick={onClick}>count: {count}<button/>);
}

const MySecondComponent: React.FC = () => {
  const [count, setter] = useCountGlobal();
  const onClick = useCallback(() => setter(currentState => currentState + 1));

  return (<button onclick={onClick}>count: {count}<button/>);
}

// Just like that! You are now using a global state!!
```

Note that the only difference between this and the default **useState** hook is that you are not adding the initial value, cause you already did that when you created the store:

```JSX
const countStore = new GlobalStore(0);
```

## Persisted store

You could persist the state with **local-storage** by just adding the **storage-key** to the constructor of your global-store, for example: 

```JSX
// The FIRST parameter is the initial value of the state
// The Second parameter is an API to restrict access to the state, will talk about that later on [README]:./README.advance.md
// The Third parameter is the key that will be used on the local-storage
const countStore = new GlobalStore(0, null, 'GLOBAL_COUNT');
```

## Consuming Persisted Store

```JSX
const MyComponent: React.FC = () => {
  // connect the component to the global persisted storage
  const [count, setCount] = useCountGlobal();
  const onClickAddOne = () => setCount(count + 1);

  return (<button onclick={onClickAddOne}>count: {count}<button/>);
}
```

## Decoupled hook

If you want to access the global state outside a component or outside a hook, or without subscribing the component to the state changes... 

This is especially useful when you want to create components that have edition access to a certain store, but they actually don't need to be reactive to the state changes, like a search component that just need to get the current state every time that is going to search the data; but actually don't need to be subscribed to the changes over the collection he is going to be filtering. 


```JSX
import GlobalStore from 'react-global-state-hooks';

const countStore = new GlobalStore(0);

// remember this should be used as the **useState** hook.
export const useCountGlobal = countStore.getHook();

// this functions are not hooks, and they can be used in whatever place into your code, ClassComponents, OtherHooks, Services etc.
export const [getCountGlobalValue, setCountGlobalValue] = countStore.getHookDecoupled();

```

Let's see a trivial example: 

```JSX
import { useCountGlobal, setCountGlobalValue } from './useCountGlobal'

const CountDisplayerComponent: React.FC = () => {
  const [count] = useCountGlobal();

  return (<label>{count}<label/>);
}

// Stage2 does not need to be updated once the global count changes
const CountManagerComponent: React.FC = () => {
  const increaseClick = () => setCountGlobalValue(count => count + 1);
  const decreaseClick = () => setCountGlobalValue(count => count - 1);

  return (<>
      <button onclick={increaseClick}>increase<button/>
      <button onclick={decreaseClick}>decrease<button/>
    </>);
}
```

## Advance Config
Here you can see more information how to create more complex services for your global stores.
[README]:./README.advance.md

## Advantages:
1. Using REACT's simplest and default way to deal with the state.
2. Adding partial state designations (This is not on useState default functionality)
3. Added availability to create actions and decoupled access to the states, no more connects, and dispatches, just call your actions as a normal service of whatever other libraries.
4. This library is already taking care of avoiding re-renders if the new state does not have changes
5. This tool also take care for you to avoid **localStorage** data to lose the data types that you stored. For example when you are using datetimes
6. This library also is taking care of batching multiple stores updates by using **React unstable_batchedUpdates**; this is a problem that the **useState** have when you call multiple **setStates** into async flows as setTimeout

# Finallly notes:
Are concern about performance? this library is for you, instead of handling huge complex stores with options like redux, or by passing the setState to a context Provider (because of the limitations that the context has)... You should just use this library, we are using the more atomic and 'native' way that REACT gives to handle the state, and that is the hook **useState**... 

This utility is just including the implementation of the use state into a subscriber pattern, to enable you to create hooks that will be subscribed to specific store changes, does how we'll be creating a global state hook. 

