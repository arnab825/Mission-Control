import { useState, useEffect } from 'react';

/**
 * Custom React hook to debounce state changes or inputs to prevent unnecessary backend updates or expensive rendering
 * @param value The value to debounce
 * @param delay Delay in milliseconds
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
