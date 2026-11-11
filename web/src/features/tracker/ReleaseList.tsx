import { useState } from 'react'
import { StatusPill } from '../../components/ui/Badges'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/States'
import { formatDate, parseISODate, today } from '../../lib/dates'
import type { Release } from '../../types'
import { groupByWeek, typeTone, weekStart } from './releases'

const WEEKS_PER_PAGE = 6

/** Release calendar grouped by week, newest first, with the current week highlighted. */
export function ReleaseList({
  releases,
  onSelect,
}: {
  releases: Release[]
  onSelect: (release: Release) => void
}) {
  const [shown, setShown] = useState(WEEKS_PER_PAGE)
  if (releases.length === 0) {
    return <EmptyState title="No releases" message="Nothing matches the current filters." />
  }
  const weeks = groupByWeek(releases)
  const current = weekStart(today())

  return (
    <div className="release-weeks">
      {weeks.slice(0, shown).map(({ week, rows }) => (
        <section key={week} className={`release-week ${week === current ? 'current' : ''}`}>
          <header>
            <h3>Week of {formatDate(week, { year: 'numeric' })}</h3>
            {week === current && <span className="dev-badge">This week</span>}
            <span className="count-pill">{rows.length}</span>
          </header>
          <ul>
            {rows.map((r) => {
              const date = parseISODate(r.releaseDate)
              return (
                <li key={r.id} className="release-row">
                  <span className="release-day" aria-hidden="true">
                    <b>{date.getDate()}</b>
                    <small>{date.toLocaleDateString(undefined, { weekday: 'short' })}</small>
                  </span>
                  <div className="release-main">
                    <button type="button" className="link-button" onClick={() => onSelect(r)}>
                      {r.title}
                    </button>
                    <small>
                      <span className="sr-only">{formatDate(r.releaseDate)} · </span>
                      {r.systems || 'No systems listed'}
                      {r.layer && ` · ${r.layer}`}
                      {r.notes && ` · ${r.notes}`}
                    </small>
                  </div>
                  <span className={`type-tag tone-${typeTone(r.type)}`}>{r.type}</span>
                  <div className="release-people">
                    <span>
                      <small>Tech</small>
                      {r.techOwner || '—'}
                    </span>
                    <span>
                      <small>BU</small>
                      {r.buSpoc || '—'}
                    </span>
                  </div>
                  <span
                    className={`sanity sanity-${r.sanityTest ? (r.sanityTest === 'Applicable' ? 'yes' : 'no') : 'unknown'}`}
                  >
                    {r.sanityTest || 'Sanity TBD'}
                  </span>
                  <StatusPill status={r.status} />
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {weeks.length > shown && (
        <div className="release-more">
          <Button variant="secondary" size="sm" onClick={() => setShown((n) => n + WEEKS_PER_PAGE)}>
            Show older weeks ({weeks.length - shown} more)
          </Button>
        </div>
      )}
    </div>
  )
}
