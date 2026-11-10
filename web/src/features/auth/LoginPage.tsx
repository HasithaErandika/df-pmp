import { useState } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowRight, Info, ShieldCheck } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useConfig } from '../../context/ConfigContext'
import { useSession } from '../../context/SessionContext'
import { ScheduleField } from './ScheduleField'

function MicrosoftMark() {
  return (
    <svg className="microsoft-mark" viewBox="0 0 20 20" aria-hidden="true">
      <path fill="#f25022" d="M1 1h8.5v8.5H1z" />
      <path fill="#7fba00" d="M10.5 1H19v8.5h-8.5z" />
      <path fill="#00a4ef" d="M1 10.5h8.5V19H1z" />
      <path fill="#ffb900" d="M10.5 10.5H19V19h-8.5z" />
    </svg>
  )
}

const signInErrors: Record<string, string> = {
  access_denied: 'Sign-in was cancelled or consent was not granted.',
  signin_expired: 'The sign-in took too long. Please try again.',
  signin_failed:
    'Microsoft sign-in could not be completed. Please try again or contact your administrator.',
  account_disabled: 'Your df-pmp account is deactivated. Contact your administrator.',
}

export default function LoginPage() {
  const config = useConfig()
  const { session, status, loading, error, signIn } = useSession()
  const location = useLocation()
  const [params] = useSearchParams()
  const [notice, setNotice] = useState('')
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const microsoft = status?.mode === 'entra'
  const signInError = signInErrors[params.get('error') ?? '']

  if (session) return <Navigate to={from} replace />

  return (
    <div className="login-page">
      <div className="login-visual">
        <ScheduleField />
        <div className="login-visual-fade" />
        <div className="login-visual-copy">
          <p className="mono-kicker">PORTFOLIO · ITSSC · OPERATIONS</p>
          <h2>Every project, decision and follow-up in one governed record.</h2>
        </div>
      </div>

      <main className="login-main">
        <div className="login-form-wrap">
          <div className="login-brand">
            <img src={config.logoPath} alt="" width={36} height={36} />
            <span>
              <b>{config.applicationName.toUpperCase()}</b>
              <small>{config.companyName}</small>
            </span>
          </div>
          <h1>Sign in to {config.applicationName.toUpperCase()}</h1>
          <p className="login-subtitle">
            {config.companyName} {config.productDescription}
          </p>

          <Button
            variant={microsoft ? 'primary' : 'secondary'}
            className="login-microsoft"
            loading={loading && microsoft}
            onClick={() =>
              microsoft
                ? signIn(from)
                : setNotice(
                    'Microsoft sign-in is not configured yet. An administrator must set AUTH_MODE=entra.',
                  )
            }
          >
            <MicrosoftMark />
            Continue with Microsoft
          </Button>

          {signInError && (
            <div className="inline-alert alert-error" role="alert">
              <Info size={14} aria-hidden /> {signInError}
            </div>
          )}
          {notice && (
            <div className="inline-alert" role="status">
              <Info size={14} aria-hidden /> {notice}
            </div>
          )}
          {error && (
            <div className="inline-alert alert-error" role="alert">
              {error.message}
            </div>
          )}

          {status?.mode === 'preview' && (
            <>
              <div className="login-divider">
                <span />
                or
                <span />
              </div>

              <button
                type="button"
                className="preview-access"
                onClick={() => signIn(from)}
                disabled={loading}
              >
                <span>
                  <b>Open the preview workspace</b>
                  <small>Explore df-pmp with sample projects, work and meetings.</small>
                </span>
                <ArrowRight size={16} aria-hidden />
              </button>
            </>
          )}

          <p className="login-legal">
            <ShieldCheck size={14} aria-hidden />
            Access is managed by your organization. Contact your administrator if you need an
            account.
          </p>
        </div>
      </main>
    </div>
  )
}
