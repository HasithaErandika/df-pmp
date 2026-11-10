import { useState } from 'react'

export type Segment = { label: string; value: number; color: string }

const SIZE = 168
const STROKE = 22
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 2 // surface gap between segments, in px along the ring

/**
 * Part-to-whole ring with a legend that always shows label and value, so identity
 * never relies on colour. Hovering a segment or legend row focuses it in the centre.
 */
export function DonutChart({ segments, totalLabel }: { segments: Segment[]; totalLabel: string }) {
  const [active, setActive] = useState<number | null>(null)
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const visible = segments.filter((s) => s.value > 0).length
  const focus = active === null ? null : segments[active]
  let offset = 0

  return (
    <div className="donut">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="donut-ring"
        role="img"
        aria-label={`${totalLabel}: ${segments.map((s) => `${s.label} ${s.value}`).join(', ')}`}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          className="donut-track"
          strokeWidth={STROKE}
        />
        {total > 0 &&
          segments.map((segment, index) => {
            const length = (segment.value / total) * CIRCUMFERENCE
            const drawn = Math.max(0, length - (visible > 1 ? GAP : 0))
            const dash = `${drawn} ${CIRCUMFERENCE - drawn}`
            const node = (
              <circle
                key={segment.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={segment.color}
                strokeWidth={active === index ? STROKE + 4 : STROKE}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                className={`donut-segment ${active !== null && active !== index ? 'dimmed' : ''}`}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
              />
            )
            offset += length
            return segment.value > 0 ? node : null
          })}
      </svg>
      <div className="donut-center" aria-hidden="true">
        <b className="tabular">{focus ? focus.value : total}</b>
        <span>{focus ? focus.label : totalLabel}</span>
      </div>
      <ul className="chart-legend">
        {segments.map((segment, index) => (
          <li
            key={segment.label}
            className={active !== null && active !== index ? 'dimmed' : ''}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
          >
            <i style={{ background: segment.color }} aria-hidden="true" />
            <span>{segment.label}</span>
            <b className="tabular">{segment.value}</b>
            <small className="tabular">
              {total ? Math.round((segment.value / total) * 100) : 0}%
            </small>
          </li>
        ))}
      </ul>
    </div>
  )
}
