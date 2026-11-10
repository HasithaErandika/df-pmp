import { Loader2 } from 'lucide-react'
import { Button } from './Button'

type FullPageStateProps = {
  title: string
  message: string
  busy?: boolean
  action?: { label: string; onClick: () => void }
}

/** Centered full-screen message for app-level loading and failure states. */
export function FullPageState({ title, message, busy = false, action }: FullPageStateProps) {
  return (
    <main className="app-loading" aria-busy={busy}>
      <img src="/df-pmp-symbol.svg" alt="" width={44} height={44} />
      <h1>{title}</h1>
      <p role={busy ? 'status' : 'alert'}>
        {busy && <Loader2 size={14} className="spin" aria-hidden />}
        {message}
      </p>
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </main>
  )
}
