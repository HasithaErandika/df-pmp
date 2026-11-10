import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { useStatusTone } from '../../context/ConfigContext'
import { initials } from '../../lib/dates'

/** Status label coloured by the configured status tone. */
export function StatusPill({ status }: { status: string }) {
  const toneFor = useStatusTone()
  return (
    <span className={`status-pill tone-${toneFor(status)}`}>
      <i aria-hidden="true" />
      {status}
    </span>
  )
}

const priorityIcons = { High: ArrowUp, Low: ArrowDown } as const

/** Priority with a direction cue so meaning does not rely on colour alone. */
export function PriorityLabel({ priority }: { priority: string }) {
  const Icon = priorityIcons[priority as keyof typeof priorityIcons] ?? Minus
  return (
    <span className={`priority priority-${priority.toLowerCase()}`}>
      <Icon size={13} aria-hidden />
      {priority}
    </span>
  )
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span className={`avatar avatar-${size}`} title={name} aria-hidden="true">
      {initials(name) || '?'}
    </span>
  )
}

export function ProgressBar({
  value,
  tone = 'blue',
  label,
}: {
  value: number
  tone?: string
  label: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span className={`progress-fill fill-${tone}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}
