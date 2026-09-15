import { useEffect } from 'react';
import { useDebounce } from './useDebounce';

export const useDebounceEffect = (callback: () => (() => void) | void, dependencies: unknown[], delay: number) => {
  const debouncedCallback = useDebounce(callback, delay);

  useEffect(debouncedCallback, [debouncedCallback, ...dependencies]);
};
