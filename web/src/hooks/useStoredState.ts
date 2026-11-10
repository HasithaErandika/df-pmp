import { useState } from 'react'

/** useState persisted to localStorage for per-viewer UI preferences. Falls back silently when storage is blocked. */
export function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored === null ? initial : (JSON.parse(stored) as T)
    } catch {
      return initial
    }
  })
  const update = (next: T) => {
    setValue(next)
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // Preference is kept for this page view only.
    }
  }
  return [value, update] as const
}
