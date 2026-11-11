import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import type { Tone } from '../../types'

type MetricCardProps = {
  label: string
  value: number | undefined
  detail: string
  icon: ComponentType<{ size?: number }>
  tone: Tone
  to?: string
  /** Makes the card a toggle button (e.g. a quick filter). */
  onClick?: () => void
  active?: boolean
}

/** KPI tile. With `to` the card links to the underlying list; with `onClick` it is a toggle. */
export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  to,
  onClick,
  active,
}: MetricCardProps) {
  const body = (
    <>
      <div className="metric-top">
        <span>{label}</span>
        <span className={`metric-icon tone-${tone}`} aria-hidden="true">
          <Icon size={17} />
        </span>
      </div>
      <div className="metric-value tabular">
        {value === undefined ? '—' : value.toLocaleString()}
      </div>
      <div className="metric-foot">{detail}</div>
    </>
  )
  if (onClick) {
    return (
      <button
        type="button"
        className={`metric-card metric-link metric-toggle ${active ? 'active' : ''}`}
        data-tone={tone}
        aria-pressed={Boolean(active)}
        onClick={onClick}
      >
        {body}
      </button>
    )
  }
  return to ? (
    <Link to={to} className="metric-card metric-link" data-tone={tone}>
      {body}
    </Link>
  ) : (
    <article className="metric-card" data-tone={tone}>
      {body}
    </article>
  )
}
