import { createContext, use, useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { FullPageState } from '../components/ui/FullPageState'
import { useQuery } from '../hooks/useQuery'
import { api } from '../lib/api'
import type { Session } from '../types'

const PREVIEW_KEY = 'df-pmp-preview'

type SessionState = {
  session: Session | null
  loading: boolean
  error: Error | null
  can: (permission: string) => boolean
  startPreview: () => void
  signOut: () => void
}

const SessionContext = createContext<SessionState | null>(null)

const readPreview = () => {
  try {
    return sessionStorage.getItem(PREVIEW_KEY) === 'true'
  } catch {
    return false
  }
}

const writePreview = (enabled: boolean) => {
  try {
    if (enabled) sessionStorage.setItem(PREVIEW_KEY, 'true')
    else sessionStorage.removeItem(PREVIEW_KEY)
  } catch {
    // Storage can be unavailable (private mode); the session then lasts for this page only.
  }
}

/**
 * Tracks the signed-in user and their effective permissions.
 * Preview access is a development affordance; Entra ID sign-in will replace it.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useState(readPreview)
  const query = useQuery(preview ? 'session' : 'session:none', (signal) =>
    preview ? api.me(signal) : Promise.resolve(null),
  )

  const startPreview = useCallback(() => {
    writePreview(true)
    setPreview(true)
  }, [])

  const signOut = useCallback(() => {
    writePreview(false)
    setPreview(false)
  }, [])

  const value = useMemo<SessionState>(() => {
    const session = preview ? (query.data ?? null) : null
    const permissions = new Set(session?.permissions ?? [])
    return {
      session,
      loading: preview && query.loading,
      error: preview ? query.error : null,
      can: (permission) => permissions.has(permission),
      startPreview,
      signOut,
    }
  }, [preview, query.data, query.loading, query.error, startPreview, signOut])

  return <SessionContext value={value}>{children}</SessionContext>
}

export function useSession() {
  const state = use(SessionContext)
  if (!state) throw new Error('useSession must be used within SessionProvider')
  return state
}

/** Route guard: renders children for signed-in users and redirects others to sign-in. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()
  const location = useLocation()
  if (loading) return <FullPageState title="df-pmp" message="Signing you in…" busy />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}
