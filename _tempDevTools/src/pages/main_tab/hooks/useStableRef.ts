import { isNil } from 'json-storage-formatter';
import isFunction from 'json-storage-formatter/isFunction';
import React, { useState } from 'react';
import shallowCompare from 'react-global-state-hooks/shallowCompare';

type RefCreator<T> = () => T;

/**
 * @description Hook to create a stable ref value.
 * @param value The value that that the ref will hold
 * @returns <T> stable React ref object containing the value.
 */
function useStableRef<T>(value: T): React.RefObject<T>;

/**
 * @description Hook to create a stable ref value.
 * @param {RefCreator<T>} callback A function that creates the value that the ref will hold
 * @param deps Dependency list to determine when to recreate the value
 * @returns A stable React ref object containing the value.
 */
function useStableRef<T>(callback: RefCreator<T>, deps: React.DependencyList): React.RefObject<T>;

function useStableRef<T>(builder: T | RefCreator<T>, deps?: React.DependencyList): React.RefObject<T> {
  const hasDeps = !isNil(deps);
  const compute = () => (hasDeps && isFunction(builder) ? builder() : builder);

  const [ref] = useState(() => ({
    current: hasDeps ? compute() : builder,
    dependencies: deps,
  }));

  const isSameDeps = deps === ref.dependencies;
  const shouldUpdate = !hasDeps || (!isSameDeps && !shallowCompare(ref.dependencies, deps));
  if (shouldUpdate) ref.current = compute();

  ref.dependencies = deps;

  return ref as React.RefObject<T>;
}

export default useStableRef;
