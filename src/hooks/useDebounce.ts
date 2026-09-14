import { useEffect, useState } from 'react'

/**
 * Debounce for search input.
 *
 * Kept short (default 160ms). Latency is the thing that makes a
 * typeahead feel dead, and anything past ~200ms is perceptible as lag
 * between the keystroke and the list moving.
 */
export function useDebounce<T>(value: T, delay = 160): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debounced
}
