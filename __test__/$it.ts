import { renderHook as renderHookBase } from '@testing-library/react';

/**
 * Custom it function to run tests in both strict and non-strict mode.
 * @param name - The name of the test.
 * @param fn - The test function that receives renderHook and strict mode flag.
 * @param only - If true, runs only this test.
 */
function $it(
  name: string,
  fn: (param1: { renderHook: typeof renderHookBase; strict: boolean }) => void,
  { only }: { only?: boolean } = { only: false },
) {
  const executeTest = (strict: boolean) => {
    (only ? it.only : it)(`${name} ${strict && '[STRICT-MODE]'}`, () =>
      fn({ renderHook: strict ? strictRenderHook : renderHookBase, strict }),
    );
  };

  executeTest(true);
  executeTest(false);
}

const strictRenderHook = ((...[param1, param2]: Parameters<typeof renderHookBase>) => {
  return renderHookBase(param1, {
    ...param2,
    reactStrictMode: true,
  });
}) as typeof renderHookBase;

$it.only = (name: string, fn: (param1: { renderHook: typeof renderHookBase; strict: boolean }) => void) => {
  $it(name, fn, { only: true });
};

export default $it;
