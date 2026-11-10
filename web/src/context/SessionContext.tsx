import { createContext, use, useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { FullPageState } from '../components/ui/FullPageState'
import { invalidate, useQuery } from '../hooks/useQuery'
import { api, ApiError, apiBase } from '../lib/api'
import type { AuthStatus, Session } from '../types'

const PREVIEW_KEY = 'df-pmp-preview'

type SessionState = {
  session: Session | null
  status: AuthStatus | undefined
  loading: boolean
  error: Error | null
  can: (permission: string) => boolean
  /** Microsoft 365 feature is available for this signed-in session. */
  hasMicrosoft: (feature: keyof AuthStatus['features']) => boolean
  signIn: (returnTo?: string) => void
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionState | null>(null)

const storage = {
  get: () => {
    try {
      return sessionStorage.getItem(PREVIEW_KEY) === 'true'
    } catch {
      return false
    }
  },
  set: (enabled: boolean) => {
    try {
      if (enabled) sessionStorage.setItem(PREVIEW_KEY, 'true')
      else sessionStorage.removeItem(PREVIEW_KEY)
    } catch {
      // Storage unavailable (private mode): the preview lasts for this page only.
    }
  },
}

/**
 * Tracks the signed-in user. With Microsoft Entra ID the API owns the session (HTTP-only cookie);
 * in preview mode a local flag stands in for sign-in during development.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const statusQuery = useQuery('auth-status', api.authStatus)
  const status = statusQuery.data
  const [preview, setPreview] = useState(storage.get)
  const [attempt, setAttempt] = useState(0)
  const wantsSession = status?.mode === 'entra' || (status?.mode === 'preview' && preview)
  const key = !status ? 'session:pending' : wantsSession ? `session:${attempt}` : 'session:none'
  const me = useQuery(key, async (signal) => {
    if (!wantsSession) return null
    try {
      return await api.me(signal)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null // not signed in yet
      throw error
    }
  })

  const signIn = useCallback(
    (returnTo = '/') => {
      if (status?.mode === 'entra') {
        window.location.assign(
          `${apiBase}/api/v1/auth/login?returnTo=${encodeURIComponent(returnTo)}`,
        )
        return
      }
      storage.set(true)
      setPreview(true)
      setAttempt((n) => n + 1)
    },
    [status?.mode],
  )

  const signOut = useCallback(async () => {
    if (status?.mode === 'entra') await api.logout().catch(() => undefined)
    storage.set(false)
    setPreview(false)
    setAttempt((n) => n + 1)
    invalidate('session')
  }, [status?.mode])

  const value = useMemo<SessionState>(() => {
    const session = me.data ?? null
    const permissions = new Set(session?.permissions ?? [])
    return {
      session,
      status,
      loading: !status || (wantsSession && me.loading && me.data === undefined),
      error: statusQuery.error ?? me.error,
      can: (permission) => permissions.has(permission),
      hasMicrosoft: (feature) =>
        Boolean(status?.features[feature] && session?.microsoft === 'connected'),
      signIn,
      signOut,
    }
  }, [me.data, me.loading, me.error, status, statusQuery.error, wantsSession, signIn, signOut])

  return <SessionContext value={value}>{children}</SessionContext>
}

export function useSession() {
  const state = use(SessionContext)
  if (!state) throw new Error('useSession must be used within SessionProvider')
  return state
}

/** Route guard: renders children for signed-in users (optionally requiring a permission). */
export function RequireSession({
  children,
  permission,
}: {
  children: ReactNode
  permission?: string
}) {
  const { session, loading, can } = useSession()
  const location = useLocation()
  if (loading) return <FullPageState title="df-pmp" message="Signing you in…" busy />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (permission && !can(permission)) return <Navigate to="/" replace />
  return children
}
