import { useRef, useState, useEffect } from 'react';

export const useDebounceValue = <T>(value: T, delay: number): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    if (!timeoutRef.current) return;

    clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timeoutRef.current!);
  }, [value, delay]);

  return debouncedValue;
};
