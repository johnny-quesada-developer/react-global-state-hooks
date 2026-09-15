import { useRef } from 'react';
import { shallowCompare } from 'react-global-state-hooks/shallowCompare';

const dependenciesSymbol = Symbol('dependencies');

export const useImmediateEffect = (callback: () => void, dependencies: unknown[]) => {
  const dependenciesRef = useRef<typeof dependenciesSymbol | unknown[]>(dependenciesSymbol);
  const shouldExecute = !shallowCompare(dependenciesRef.current, dependencies);

  if (shouldExecute) {
    dependenciesRef.current = dependencies;

    callback();
  }
};
