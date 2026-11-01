import { useEffect, useState } from "react";

/**
 * `useDeferredValue` only yields at render time; the live race update also has to throttle the
 * network, so this keeps the last value seen for `delayMs` unchanged.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [deferred, setDeferred] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDeferred(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return deferred;
}
