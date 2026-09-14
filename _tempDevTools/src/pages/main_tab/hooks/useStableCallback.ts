import { useCallback } from 'react';
import useStableRef from './useStableRef';

type AnyFunction = (...args: any[]) => any;

export const useStableCallback = <T extends AnyFunction>(callback: T): T => {
  const callbackRef = useStableRef(callback);

  return useCallback(
    (...args: Parameters<T>) => {
      return callbackRef.current(...args);
    },
    [callbackRef]
  ) as T;
};

export default useStableCallback;
