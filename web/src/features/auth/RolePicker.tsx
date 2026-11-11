import { useState } from 'react'
import { ArrowRight, Briefcase, Loader2, ShieldCheck, UserRound } from 'lucide-react'
import { Skeleton } from '../../components/ui/States'
import { useSession } from '../../context/SessionContext'
import { useQuery } from '../../hooks/useQuery'
import { api } from '../../lib/api'

const roleIcons: Record<string, typeof UserRound> = {
  administrator: ShieldCheck,
  project_manager: Briefcase,
}
const roleTones = ['red', 'blue', 'turquoise', 'purple', 'gold']

/**
 * Development sign-in (AUTH_MODE=preview): one click signs in as a user holding the chosen role,
 * so permissions can be tested without Microsoft Entra ID.
 */
export function RolePicker({ returnTo }: { returnTo: string }) {
  const { signIn } = useSession()
  const roles = useQuery('dev-roles', api.devRoles)
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')

  const choose = async (role: string) => {
    setPending(role)
    setError('')
    try {
      await signIn(returnTo, role)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
      setPending('')
    }
  }

  return (
    <section className="role-picker" aria-labelledby="role-picker-title">
      <div className="role-picker-head">
        <h2 id="role-picker-title">Sign in with a test role</h2>
        <span className="dev-badge">Development</span>
      </div>
      <p className="role-picker-hint">Pick a role to sign in instantly and test what it can do.</p>
      {roles.error && (
        <div className="inline-alert alert-error" role="alert">
          {roles.error.message}
        </div>
      )}
      {!roles.data && !roles.error && <Skeleton rows={3} height={64} />}
      <ul className="role-list">
        {(roles.data ?? []).map((role, index) => {
          const Icon = roleIcons[role.key] ?? UserRound
          return (
            <li key={role.key}>
              <button
                type="button"
                className="role-card"
                disabled={Boolean(pending)}
                aria-busy={pending === role.key || undefined}
                onClick={() => void choose(role.key)}
              >
                <span className={`role-icon tone-${roleTones[index % roleTones.length]}`}>
                  <Icon size={18} aria-hidden />
                </span>
                <span className="role-copy">
                  <b>{role.name}</b>
                  <small>{role.description}</small>
                  <em>{role.user ? `as ${role.user}` : 'A demo user will be created'}</em>
                </span>
                {pending === role.key ? (
                  <Loader2 size={16} className="spin" aria-hidden />
                ) : (
                  <ArrowRight size={16} className="role-arrow" aria-hidden />
                )}
              </button>
            </li>
          )
        })}
      </ul>
      {error && (
        <div className="inline-alert alert-error" role="alert">
          {error}
        </div>
      )}
    </section>
  )
}
