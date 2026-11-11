import { addDays, parseISODate, toISODate, today } from '../../lib/dates'
import type { Release } from '../../types'

/** Monday of the week containing an ISO date. */
export function weekStart(value: string) {
  const date = parseISODate(value)
  return addDays(toISODate(date), -((date.getDay() + 6) % 7))
}

/** Releases grouped by week (newest week first); rows within a week run in date order. */
export function groupByWeek(releases: Release[]) {
  const weeks = new Map<string, Release[]>()
  for (const release of releases) {
    const key = weekStart(release.releaseDate)
    weeks.set(key, [...(weeks.get(key) ?? []), release])
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([week, rows]) => ({
      week,
      rows: rows.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate)),
    }))
}

const typeTones: Record<string, string> = {
  'VA fixes': 'red',
  Feature: 'purple',
  Improvement: 'blue',
  'Issue fix': 'gold',
  Mandate: 'turquoise',
}
export const typeTone = (type: string) => typeTones[type] ?? 'grey'

export function releaseStats(releases: Release[]) {
  const now = today()
  const week = weekStart(now)
  const month = now.slice(0, 7)
  return {
    thisWeek: releases.filter((r) => weekStart(r.releaseDate) === week).length,
    upcoming: releases.filter((r) => r.status === 'Planned' && r.releaseDate >= now).length,
    releasedThisMonth: releases.filter(
      (r) => r.status === 'Released' && r.releaseDate.startsWith(month),
    ).length,
    security: releases.filter((r) => r.type === 'VA fixes').length,
  }
}
