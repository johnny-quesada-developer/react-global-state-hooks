import React from 'react';
import { type ContextStoreTools, createContext, InferAPI } from '..';
import { act, render } from '@testing-library/react';
import it from './$it';

describe('createContext', () => {
  it('should pass down the proper store tools to the actions', ({ renderHook }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let storeTools!: ContextStoreTools<any, any, any>;

    const store = createContext(0, {
      actions: {
        testAction() {
          return (tools) => {
            storeTools = tools;
          };
        },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <store.Provider>{children}</store.Provider>
    );

    const { result } = renderHook(() => store.use.actions(), { wrapper });

    result.current.testAction();

    expect(storeTools).toBeDefined();
    expect(storeTools.getState).toBeInstanceOf(Function);
    expect(storeTools.setState).toBeInstanceOf(Function);
    expect(storeTools.getMetadata).toBeInstanceOf(Function);
    expect(storeTools.setMetadata).toBeInstanceOf(Function);
    expect(storeTools.subscribe).toBeInstanceOf(Function);
    expect(storeTools.actions).toBeDefined();
    expect(storeTools.use).toBeDefined();
  });

  it('should be able to use hooks as actions and receive store tools', () => {
    const store = createContext(0, {
      actions: {
        useCount() {
          return ({ use }) => {
            return use()[0];
          };
        },
      },
    });

    const { context, wrapper } = store.Provider.makeProviderWrapper();
    const renderSpy = jest.fn();

    const Component = () => {
      store.use.actions();
      const { getState } = store.use.api();
      renderSpy(getState());
      return null;
    };

    const Component2 = () => {
      const { useCount } = store.use.actions();
      const count = useCount();

      renderSpy(count);

      return null;
    };

    render(
      <>
        <Component />
        <Component2 />
      </>,
      { wrapper },
    );

    expect(renderSpy).toHaveBeenCalledTimes(2);
    expect(renderSpy).toHaveBeenCalledWith(0);

    act(() => {
      context.current.setState(1);
    });

    // there should be no renders for api hook
    expect(renderSpy).toHaveBeenCalledTimes(3);
    expect(renderSpy).toHaveBeenCalledWith(1);
  });

  it('should correctly create a context hook and provider', ({ renderHook }) => {
    const store = createContext(
      { count: 0 },
      {
        metadata: { name: 'TestContext' },
      },
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <store.Provider>{children}</store.Provider>
    );

    const { result, rerender } = renderHook(() => store.use(), { wrapper });
    let [state] = result.current;
    const [, setState, metadata] = result.current;

    expect(state).toEqual({ count: 0 });
    expect(metadata).toEqual({ name: 'TestContext' });

    act(() => {
      setState((prev) => ({ ...prev, count: prev.count + 1 }));
    });

    rerender();

    [state] = result.current;

    expect(state).toEqual({ count: 1 });
  });

  it('should correctly export api hook from the context', ({ renderHook }) => {
    const store = createContext({ count: 0 });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <store.Provider>{children}</store.Provider>
    );

    const { result, rerender } = renderHook(() => store.use.api(), { wrapper });

    result.current.setState({ count: 5 });

    // check api methods
    expect(result.current.actions).toBeNull();
    expect(result.current.createObservable).toBeInstanceOf(Function);
    expect(result.current.createSelectorHook).toBeInstanceOf(Function);
    expect(result.current.dispose).toBeInstanceOf(Function);
    expect(result.current.getMetadata).toBeInstanceOf(Function);
    expect(result.current.getState).toBeInstanceOf(Function);
    expect(result.current.select).toBeInstanceOf(Function);
    expect(result.current.setMetadata).toBeInstanceOf(Function);
    expect(result.current.setState).toBeInstanceOf(Function);
    expect(result.current.subscribe).toBeInstanceOf(Function);
    expect(result.current.use).toBeDefined();
    expect(result.current.subscribers).toBeInstanceOf(Set);

    rerender();
  });

  it('should correctly export actions hook from the context', ({ renderHook }) => {
    const spy = jest.fn();

    const store = createContext(
      { count: 0 },
      {
        actions: {
          test() {
            return () => {
              spy();
            };
          },
        },
      },
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <store.Provider>{children}</store.Provider>
    );

    const { result } = renderHook(() => store.use.actions(), { wrapper });

    result.current.test();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should correctly export select hook from the context', ({ renderHook }) => {
    const store = createContext({
      count: {
        value: 0,
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <store.Provider>{children}</store.Provider>
    );

    const { result } = renderHook(() => store.use.select((state) => state.count.value), { wrapper });

    expect(result.current).toEqual(0);
  });

  it('should correctly export observable hook from the context', async ({ renderHook }) => {
    const store = createContext({
      count: 0,
    });

    const { context, wrapper } = store.Provider.makeProviderWrapper();

    const { result } = renderHook(() => store.use.observable((state) => state.count), { wrapper });

    const spy = jest.fn();

    result.current.subscribe(spy);

    act(() => {
      context.current.setState({ count: 10 });
    });

    expect(spy).toHaveBeenCalledWith(10);
    expect(result.current.getState()).toBe(10);
  });

  it('should createSelectorHook from the context hook', ({ renderHook }) => {
    const count = createContext(0);

    const { context, wrapper } = count.Provider.makeProviderWrapper();
    const useCountX10 = count.use.createSelectorHook((count) => count * 10);
    const useCountX20 = useCountX10.createSelectorHook((countX10) => countX10 * 2);

    const { result } = renderHook(
      () => ({
        countX10: useCountX10(),
        countX20: useCountX20(),
      }),
      { wrapper },
    );

    expect(context.current.getState()).toBe(0);
    expect(result.current.countX10).toBe(0);
    expect(result.current.countX20).toBe(0);

    act(() => {
      context.current.setState(1);
    });

    expect(context.current.getState()).toBe(1);
    expect(result.current.countX10).toBe(10);
    expect(result.current.countX20).toBe(20);

    act(() => {
      context.current.setState(2);
    });

    expect(context.current.getState()).toBe(2);
    expect(result.current.countX10).toBe(20);
    expect(result.current.countX20).toBe(40);

    expect(context.current.actions).toBeNull();
    expect(context.current.getMetadata()).toEqual({});
    expect(context.current.getState).toBeInstanceOf(Function);
    expect(context.current.subscribe).toBeInstanceOf(Function);

    act(() => {
      context.current.setMetadata({ test: 'metadata' });
      context.current.setState(3);
    });

    expect(context.current.getMetadata()).toEqual({ test: 'metadata' });
    expect(context.current.getState).toBeInstanceOf(Function);
    expect(context.current.subscribe).toBeInstanceOf(Function);
    expect(context.current.actions).toBeNull();
    expect(context.current.getState).toBeInstanceOf(Function);
    expect(context.current.subscribe).toBeInstanceOf(Function);

    expect(context.current.getState()).toBe(3);
    expect(result.current.countX10).toBe(30);
    expect(result.current.countX20).toBe(60);
  });

  it('should be able to create a hook from an observable fragment and an observable from a hook', async ({
    renderHook,
  }) => {
    const count = createContext(0);

    const { context, wrapper } = count.Provider.makeProviderWrapper();
    const useCountX10 = count.use.createSelectorHook((count) => count * 10);
    const useCountX20 = useCountX10.createSelectorHook((countX10) => countX10 * 2);

    const { result } = renderHook(
      () => ({
        countX10: useCountX10(),
        countX20: useCountX20(),
      }),
      { wrapper },
    );

    const contextApi = context.current;

    act(() => {
      contextApi.setState(2);
    });

    expect(context.current.getState()).toBe(2);
    expect(result.current.countX10).toBe(20);
    expect(result.current.countX20).toBe(40);

    act(() => {
      context.current.setState(3);
    });

    expect(context.current.getState()).toBe(3);
    expect(result.current.countX10).toBe(30);
    expect(result.current.countX20).toBe(60);
  });

  it('should correctly create a selector hooks endlessly', ({ renderHook }) => {
    const count = createContext(0);

    const { context, wrapper } = count.Provider.makeProviderWrapper();
    const useCount1 = count.use.createSelectorHook((count) => count + 1);
    const useCount2 = useCount1.createSelectorHook((count) => count + 2);

    const useCount3 = useCount1.createSelectorHook((count) => count + 1);
    const useCount4 = useCount2.createSelectorHook((count) => count + 1);

    const { result } = renderHook(
      () => ({
        count3: useCount3.api(),
        count4: useCount4.api(),
      }),
      { wrapper },
    );

    const contextApi = context.current;
    const useCount5 = result.current.count3.createObservable((count) => count + 1);
    const useCount6 = result.current.count4.createObservable((count) => count + 1);

    expect(useCount5.getState()).toBe(3);
    expect(useCount6.getState()).toBe(5);

    act(() => {
      contextApi.setState(2);
    });

    expect(context.current.getState()).toBe(2);
    expect(result.current.count3.getState()).toBe(4);
    expect(result.current.count4.getState()).toBe(6);
    expect(useCount5.getState()).toBe(5);
    expect(useCount6.getState()).toBe(7);

    act(() => {
      context.current.setState(3);
    });

    expect(context.current.getState()).toBe(3);
    expect(result.current.count3.getState()).toBe(5);
    expect(result.current.count4.getState()).toBe(7);
    expect(useCount5.getState()).toBe(6);
    expect(useCount6.getState()).toBe(8);

    const useCount7 = useCount5.createSelectorHook((count) => count + 1);
    const useCount8 = useCount6.createSelectorHook((count) => count + 1);

    const { result: result2 } = renderHook(
      () => ({
        a: useCount7(),
        b: useCount8(),
      }),
      { wrapper },
    );

    expect(result2.current.a).toBe(7);
    expect(result2.current.b).toBe(9);

    act(() => {
      context.current.setState(4);
    });

    expect(context.current.getState()).toBe(4);
    expect(result.current.count3.getState()).toBe(5);
    expect(result.current.count4.getState()).toBe(7);
    expect(useCount5.getState()).toBe(6);
    expect(useCount6.getState()).toBe(8);
  });

  it('should allow onCreated callback in the provider', () => {
    expect.assertions(3);

    const counter = createContext(0);

    const type = counter.Provider;

    const { context, wrapper } = type.makeProviderWrapper({
      onCreated: (api) => {
        expect(api.getState()).toBe(0);
      },
    });

    const { container } = render(<counter.Provider></counter.Provider>, { wrapper });

    expect(container).toBeTruthy();
    expect(context.current).toBeDefined();
  });

  it('should allow testing of context actions', () => {
    expect.assertions(2);

    const counter = createContext(0, {
      actions: {
        increase() {
          return ({ setState }) => {
            setState((prev) => prev + 1);
          };
        },
        decrease() {
          return ({ setState }) => {
            setState((prev) => prev - 1);
          };
        },
      },
    });

    const Children = () => {
      const [count] = counter.use();

      return `count: ${count}`;
    };

    const { wrapper, context } = counter.Provider.makeProviderWrapper();

    const { getByText, rerender } = render(<Children />, {
      wrapper,
    });

    jest.spyOn(context.current.actions, 'increase').mockImplementation(() => {
      act(() => {
        context.current.setState((prev) => prev + 10);
      });
    });

    expect(getByText('count: 0')).toBeTruthy();

    context.current.actions.increase();

    rerender(<Children />);

    expect(getByText('count: 10')).toBeTruthy();
  });

  it('should allow wrappers with initial value for testing', () => {
    expect.assertions(1);

    const counter = createContext(0);

    const Children = () => {
      const [count] = counter.use();

      return `count: ${count}`;
    };

    const { wrapper } = counter.Provider.makeProviderWrapper({
      value: 2,
    });

    const { getByText } = render(<Children />, {
      wrapper,
    });

    expect(getByText('count: 2')).toBeTruthy();
  });

  it('should correctly apply selectors on the main hook', ({ renderHook }) => {
    const store = createContext({ countA: 1, countB: 2 });

    const { result } = renderHook(() => store.use(({ countA, countB }) => countA + countB), {
      wrapper: store.Provider,
    });

    const [state] = result.current;

    expect(state).toEqual(3);
  });

  it('should correctly execute the lifecycle callbacks', async ({ renderHook, strict }) => {
    const initSpy = jest.fn();
    const onMountedSpy = jest.fn();
    const stateChangedSpy = jest.fn();
    const unmountSpy = jest.fn();

    const store = createContext(
      { countA: 1, countB: 2 },
      {
        callbacks: {
          onInit(arg) {
            initSpy(arg);
          },
          onStateChanged(arg) {
            stateChangedSpy(arg);
          },
          onMounted(arg) {
            onMountedSpy(arg);

            return () => {
              unmountSpy();
            };
          },
        },
        actions: {
          incrementA() {
            return ({ setState, getState }) => {
              const { countA } = getState();
              setState((state) => ({ ...state, countA: countA + 1 }));
            };
          },
        },
      },
    );

    const { wrapper, context } = store.Provider.makeProviderWrapper();

    const { unmount, result } = renderHook(() => store.use(({ countA, countB }) => countA + countB), {
      wrapper,
    });

    await act(async () => {});

    expect(result.current[1].incrementA).toBeInstanceOf(Function);
    expect(initSpy).toHaveBeenCalledWith(context.current);
    expect(onMountedSpy).toHaveBeenCalledWith(context.current);
    expect(stateChangedSpy).not.toHaveBeenCalled();

    act(() => {
      context.current.setState({ countA: 5, countB: 10 });
    });

    expect(initSpy).toHaveBeenCalledTimes(strict ? 2 : 1);
    expect(onMountedSpy).toHaveBeenCalledTimes(strict ? 2 : 1);
    expect(stateChangedSpy).toHaveBeenCalledTimes(1);

    const changes = {
      ...context.current,
      state: { countA: 5, countB: 10 },
      previousState: { countA: 1, countB: 2 },
      identifier: undefined,
      getState: expect.any(Function),
      setState: expect.any(Function),
      getMetadata: expect.any(Function),
      setMetadata: expect.any(Function),
    } as Partial<typeof context.current>;

    delete changes.subscribe;
    delete changes.use;

    expect(stateChangedSpy).toHaveBeenCalledWith(expect.objectContaining(changes));

    unmount();

    expect(unmountSpy).toHaveBeenCalledTimes(strict ? 2 : 1);
  });

  it("should correctly handle subscriptions and don't hold unmounted subscribers", ({ renderHook }) => {
    const store = createContext(0);

    const { context, wrapper } = store.Provider.makeProviderWrapper();

    const { unmount } = renderHook(() => store.use(), {
      wrapper,
    });

    expect(context.instance.subscribers.size).toBe(1);

    unmount();

    expect(context.instance.subscribers.size).toBe(0);
  });

  it("should correctly handle subscriptions and don't hold unmounted subscribers when the provider is unmounted", ({
    render,
  }) => {
    const store = createContext(0);

    const { context, wrapper: Provider } = store.Provider.makeProviderWrapper();

    const ChildComponent = () => {
      store.use();
      return null;
    };

    const { unmount } = render(<Provider>{<ChildComponent />}</Provider>);

    expect(context.instance.subscribers.size).toBe(1);

    unmount();

    expect(context.instance.subscribers.size).toBe(0);
  });

  it('should types work correctly with localstorage and onInit', ({ renderHook }) => {
    type CountContextApi = InferAPI<typeof count$>;

    const count$ = createContext(0, {
      name: 'count',
      callbacks: {
        onInit: (tools) => {
          const storeTools = tools as CountContextApi;
          storeTools.actions.increase(1);
        },
      },
      actions: {
        increase: (n: number) => {
          return ({ getState, setState }) => {
            setState(getState() + n);
          };
        },
      },
    });

    const { result } = renderHook(() => count$.use.actions(), {
      wrapper: count$.Provider,
    });

    expect(result.current.increase).toBeInstanceOf(Function);
  });
});
