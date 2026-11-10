import type { ReactNode } from 'react'

export type BarDatum = { key: string; label: ReactNode; value: number; detail?: string }

/**
 * Ranked horizontal bars for a single measure. One hue (single series, so no legend),
 * value at the bar tip, and a recessive track so lengths compare against a common scale.
 */
export function BarList({ data, unit, max }: { data: BarDatum[]; unit: string; max?: number }) {
  const scale = max ?? Math.max(1, ...data.map((d) => d.value))
  return (
    <ul className="bar-list">
      {data.map((d) => (
        <li key={d.key} title={`${d.value} ${unit}${d.detail ? ` · ${d.detail}` : ''}`}>
          <span className="bar-label">{d.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(d.value / scale) * 100}%` }} />
          </span>
          <b className="bar-value tabular">{d.value}</b>
        </li>
      ))}
    </ul>
  )
}
