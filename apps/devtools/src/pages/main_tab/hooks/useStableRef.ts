import { isNil } from 'json-storage-formatter';
import isFunction from 'json-storage-formatter/isFunction';
import React, { useState } from 'react';
import shallowCompare from 'react-global-state-hooks/shallowCompare';

type RefCreator<T> = () => T;

// This ref is ALWAYS populated (it's seeded on first render and recomputed in place), so `current`
// is `T`, never `null`. We type it as a plain `{ current: T }` object rather than
// `React.RefObject<T>` because React 18's `RefObject.current` is `T | null` (and readonly), which
// would force spurious null checks at every call site even though the value can't be null here.
type StableRef<T> = { current: T };

/**
 * @description Hook to create a stable ref value.
 * @param value The value that that the ref will hold
 * @returns <T> stable ref object containing the value.
 */
function useStableRef<T>(value: T): StableRef<T>;

/**
 * @description Hook to create a stable ref value.
 * @param {RefCreator<T>} callback A function that creates the value that the ref will hold
 * @param deps Dependency list to determine when to recreate the value
 * @returns A stable ref object containing the value.
 */
function useStableRef<T>(callback: RefCreator<T>, deps: React.DependencyList): StableRef<T>;

function useStableRef<T>(builder: T | RefCreator<T>, deps?: React.DependencyList): StableRef<T> {
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

  return ref as StableRef<T>;
}

export default useStableRef;
