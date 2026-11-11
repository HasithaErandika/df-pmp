import { useCallback, useEffect, useEffectEvent, useState } from 'react'

type QueryState<T> = { key: string; data: T | undefined; error: Error | null; loading: boolean }

const invalidations = new EventTarget()
/** Last successful result per key, shown immediately on remount while fresh data loads. */
const cache = new Map<string, unknown>()

/** Marks cached queries whose key starts with any prefix as stale so mounted views refetch. */
export function invalidate(...prefixes: string[]) {
  invalidations.dispatchEvent(new CustomEvent('invalidate', { detail: prefixes }))
}

/**
 * Loads data for a key, cancelling in-flight requests when the key changes or the view unmounts.
 * Views refetch automatically when a matching key prefix is invalidated after a mutation.
 * Keys must uniquely identify the request, including its parameters.
 */
export function useQuery<T>(key: string, fetcher: (signal: AbortSignal) => Promise<T>) {
  const [stored, setState] = useState<QueryState<T>>(() => ({
    key,
    data: cache.get(key) as T | undefined,
    error: null,
    loading: true,
  }))
  // When the key changes, never expose the previous key's result for the render before the effect runs.
  const state: QueryState<T> =
    stored.key === key
      ? stored
      : { key, data: cache.get(key) as T | undefined, error: null, loading: true }
  const [version, setVersion] = useState(0)
  const load = useEffectEvent((signal: AbortSignal) => fetcher(signal))

  useEffect(() => {
    const controller = new AbortController()
    setState({ key, data: cache.get(key) as T | undefined, error: null, loading: true })
    load(controller.signal)
      .then((data) => {
        cache.set(key, data)
        setState({ key, data, error: null, loading: false })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const normalized = error instanceof Error ? error : new Error('Unable to load data')
        setState((current) => ({ ...current, error: normalized, loading: false }))
      })
    return () => controller.abort()
  }, [key, version])

  useEffect(() => {
    const onInvalidate = (event: Event) => {
      const prefixes = (event as CustomEvent<string[]>).detail
      if (prefixes.some((prefix) => key.startsWith(prefix))) setVersion((value) => value + 1)
    }
    invalidations.addEventListener('invalidate', onInvalidate)
    return () => invalidations.removeEventListener('invalidate', onInvalidate)
  }, [key])

  const reload = useCallback(() => setVersion((value) => value + 1), [])
  const { data, error, loading } = state
  return { data, error, loading, reload }
}
