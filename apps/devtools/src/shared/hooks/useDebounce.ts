import { useCallback, useEffect, useRef } from 'react';

export const useDebounce = <T extends (...args: any[]) => void>(callback: T, delay: number) => {
  const timeoutRef = useRef<{
    timeout: NodeJS.Timeout | null;
    callback: T;
  }>({
    timeout: null,
    callback,
  });

  const cleanup = () => {
    clearTimeout(timeoutRef.current.timeout!);
  };

  /**
   * Cleanup the timeout when the component is unmounted
   */
  useEffect(() => {
    return cleanup;
  }, []);

  /**
   * Update the callback when it changes
   */
  useEffect(() => {
    timeoutRef.current.callback = callback;
  }, [callback]);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      cleanup();

      timeoutRef.current.timeout = setTimeout(() => {
        timeoutRef.current.callback(...args);
      }, delay);
    },
    [delay]
  );

  return debounced;
};
