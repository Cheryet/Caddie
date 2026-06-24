/**
 * useDebouncedValue — Hook
 * Returns a copy of `value` that only updates after `delayMs` has elapsed
 * without a further change. Lets a controlled input stay responsive while the
 * expensive derived work it drives (e.g. LibraryScreen's client-side search
 * filter) waits until typing settles.
 */

import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
