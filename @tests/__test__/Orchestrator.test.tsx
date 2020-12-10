import * as Hooks from '../globalStates';
import Orchestrator from '../Orchestrator';
import React from 'react';
import ReactDom from 'react-dom';
import Stage1 from '../Stage1';
import Stage2 from '../Stage2';
import Stage3 from '../Stage3';
import renderer from 'react-test-renderer';

describe('Orchestrator', () => {
  const createOrchestrator = (): renderer.ReactTestRenderer => {
    let wrapper: renderer.ReactTestRenderer | null = null;

    renderer.act(() => {
      wrapper = renderer.create(<Orchestrator />);
    });

    return wrapper as unknown as renderer.ReactTestRenderer;
  };

  beforeEach(() => {
    // avoid warn: You should try avoid call the same state-setter multiple times at one execution line
    jest.spyOn(console, 'warn').mockImplementation(jest.fn());
  });

  describe('render', () => {
    it('Should render correclty, no re-renders', () => {
      const wrapper = createOrchestrator();

      expect(Stage1).toHaveBeenCalledTimes(1);
      expect(Stage2).toHaveBeenCalledTimes(1);
      expect(Stage3).toHaveBeenCalledTimes(1);

      wrapper.unmount();
    });
  });

  describe('hooks', () => {
    const testNumericHook = (hookName: keyof typeof Hooks) => {
      let orchestratorWrapper: renderer.ReactTestRenderer;
      let getter: any;
      let setter: any;
      let increaseValue: () => Promise<unknown>;
      let decreaseValue: () => Promise<unknown>;
      let checkCurrentValue: (newValue: number) => void;
      let unstableBatchedUpdatesSpy: jest.SpyInstance<any>;

      beforeEach(async () => {
        orchestratorWrapper = await createOrchestrator();
        ([getter, setter] = Hooks[hookName]());
        increaseValue = () => Promise.resolve();
        decreaseValue = () => Promise.resolve();

        if (typeof setter === 'function') {
          increaseValue = (): Promise<void> => setter((currentValue: number) => currentValue + 1);
          decreaseValue = (): Promise<void> => setter((currentValue: number) => currentValue - 1);
        } else {
          increaseValue = (): Promise<void> => setter.increase(1);
          decreaseValue = (): Promise<void> => setter.decrease(1);
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        checkCurrentValue = (_newValue: number) => {};
        if (typeof getter === 'function') {
          checkCurrentValue = (newValue: number) => {
            const currentValue = getter();

            expect(currentValue).toBe(newValue);
          };
        }

        unstableBatchedUpdatesSpy = jest.spyOn(ReactDom, 'unstable_batchedUpdates');
      });

      afterAll(() => {
        orchestratorWrapper.unmount();
      });

      const checkFirstRender = () => {
        checkCurrentValue(0);
        [Stage1, Stage2, Stage3].forEach((stage) => {
          expect(stage).toHaveBeenCalledTimes(1);
        });
      };

      it('check initial state [1 render]', () => {
        checkFirstRender();
      });

      it('check all state updates should be batched [2 renders]', async () => {
        checkFirstRender();

        await renderer.act(async () => {
          increaseValue();
          checkCurrentValue(1);

          increaseValue();
          checkCurrentValue(2);

          // with-current-value-equal => 2
          // await batches update
          await decreaseValue();

          checkCurrentValue(1);
        });

        // just one batch of changes
        expect(unstableBatchedUpdatesSpy).toHaveBeenCalledTimes(1);

        // note that even calling 3 times the increase/decrease functions...
        // the render is just gonna happen once, all changes are batch
        [Stage1, Stage2].forEach((stage) => {
          expect(stage).toHaveBeenCalledTimes(2); // first render and last update
        });
      });

      it('decoupled hooks should not perform renders', async () => {
        expect(Stage3).toHaveBeenCalledTimes(1);

        await renderer.act(async () => {
          await increaseValue();
          checkCurrentValue(2);
        });

        expect(Stage3).toHaveBeenCalledTimes(1);
        [Stage1, Stage2].forEach((stage) => {
          expect(stage).toHaveBeenCalledTimes(2); // first render and last update
        });
      });
    };

    describe('useCountStoreDecoupled', () => {
      testNumericHook('useCountStoreDecoupled');
    });

    describe('useCountPercistDecoupled', () => {
      beforeEach(() => {
        const persistStorage: {[key: string]: string} = {};

        (global.localStorage.getItem as jest.Mock).mockImplementation((key) => persistStorage[key] || null);
        (global.localStorage.setItem as jest.Mock).mockImplementation((key, value) => {
          persistStorage[key] = value;
        });
      });

      testNumericHook('useCountPercistDecoupled');
    });

    describe('useCountWithActionsDecoupled', () => {
      testNumericHook('useCountWithActionsDecoupled');
    });

    describe('useCountWithActionsTypedDecoupled', () => {
      testNumericHook('useCountWithActionsTypedDecoupled');
    });

    describe('useCountWithActionsDecoupledP', () => {
      testNumericHook('useCountWithActionsDecoupledP');
    });
  });
});

export default {};
