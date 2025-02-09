import { combineRetrieverAsynchronously, createGlobalState } from '../src';

import { createDecoupledPromise } from 'cancelable-promise-jq';

describe('combiners', () => {
  it('should combine two global states', () => {
    const [retriever1, setter1] = createGlobalState({
      a: 1,
    }).stateControls();

    const [retriever2] = createGlobalState({
      b: 2,
    }).stateControls();

    const [useDerivate, retriever3] = combineRetrieverAsynchronously(
      {
        selector: ([a, b]) => ({
          ...a,
          ...b,
        }),
      },
      retriever1,
      retriever2
    );

    let [data] = useDerivate();

    expect.assertions(7);

    expect(data).toEqual({
      a: 1,
      b: 2,
    });

    let unsubscribe = retriever3(
      (state) => {
        return state.a;
      },
      (state) => {
        expect(retriever3()).toEqual({
          a: 1,
          b: 2,
        });

        expect(state).toEqual(1);
      }
    );

    unsubscribe();

    expect(retriever3()).toEqual({
      a: 1,
      b: 2,
    });

    let [b] = useDerivate(({ b }) => b);

    expect(b).toEqual(2);

    setter1((state) => ({
      ...state,
      a: 3,
    }));

    const decouplePromise = createDecoupledPromise();

    unsubscribe = retriever3(
      (state) => {
        expect(state).toBe(retriever3());

        expect(retriever3()).toEqual({
          a: 3,
          b: 2,
        });

        unsubscribe();
        decouplePromise.resolve();
      },
      {
        skipFirst: true,
      }
    );

    return decouplePromise.promise;
  });
});
