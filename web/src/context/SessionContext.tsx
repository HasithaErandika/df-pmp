import { createContext, use, useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { FullPageState } from '../components/ui/FullPageState'
import { invalidate, useQuery } from '../hooks/useQuery'
import { api, ApiError, apiBase } from '../lib/api'
import type { AuthStatus, Session } from '../types'

type SessionState = {
  session: Session | null
  status: AuthStatus | undefined
  loading: boolean
  error: Error | null
  can: (permission: string) => boolean
  /** Microsoft 365 feature is available for this signed-in session. */
  hasMicrosoft: (feature: keyof AuthStatus['features']) => boolean
  /** Entra: redirects to Microsoft. Preview: signs in with the chosen role. */
  signIn: (returnTo?: string, role?: string) => Promise<void>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionState | null>(null)

/**
 * Tracks the signed-in user. The API owns the session (HTTP-only cookie) in both modes: Microsoft
 * Entra ID in production, or the development role sign-in when the API runs with AUTH_MODE=preview.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const statusQuery = useQuery('auth-status', api.authStatus)
  const status = statusQuery.data
  const [attempt, setAttempt] = useState(0)
  const wantsSession = status?.mode === 'entra' || status?.mode === 'preview'
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
    async (returnTo = '/', role = '') => {
      if (status?.mode === 'entra') {
        window.location.assign(
          `${apiBase}/api/v1/auth/login?returnTo=${encodeURIComponent(returnTo)}`,
        )
        return
      }
      await api.devLogin(role)
      invalidate('')
      setAttempt((n) => n + 1)
    },
    [status?.mode],
  )

  const signOut = useCallback(async () => {
    if (status?.mode === 'entra' || status?.mode === 'preview') {
      await api.logout().catch(() => undefined)
    }
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
  if (!session)
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (permission && !can(permission)) return <Navigate to="/" replace />
  return children
}
