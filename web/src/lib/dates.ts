/** Date helpers. Calendar dates use YYYY-MM-DD; meeting times are rendered in the company time zone. */

const pad = (value: number) => String(value).padStart(2, '0')

/** Formats a local Date as YYYY-MM-DD. */
export const toISODate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** Parses YYYY-MM-DD as a local date at midday, avoiding off-by-one shifts across time zones. */
export const parseISODate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

export const today = () => toISODate(new Date())

export const addDays = (value: string, days: number) => {
  const date = parseISODate(value)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export const formatDate = (value: string, options: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', ...options }).format(
    parseISODate(value),
  )

/** Returns the wall-clock parts of an instant in the given IANA time zone. */
export function zonedParts(instant: Date | string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}

/** Converts a wall-clock date and time in timeZone to an ISO instant. */
export function zonedToISO(date: string, time: string, timeZone: string) {
  const [hour, minute] = time.split(':').map(Number)
  const [year, month, day] = date.split('-').map(Number)
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  const rendered = zonedParts(new Date(guess), timeZone)
  const [rh, rm] = rendered.time.split(':').map(Number)
  const [ry, rmo, rd] = rendered.date.split('-').map(Number)
  const offset = Date.UTC(ry, rmo - 1, rd, rh, rm) - guess
  return new Date(guess - offset).toISOString()
}

export const formatTime = (instant: string, timeZone: string) =>
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone }).format(
    new Date(instant),
  )

export const isOverdue = (dueDate: string, status: string) => status !== 'Done' && dueDate < today()

export function relativeTime(instant: string) {
  const minutes = Math.round((Date.now() - new Date(instant).getTime()) / 60000)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute')
  if (Math.abs(minutes) < 1440) return rtf.format(-Math.round(minutes / 60), 'hour')
  return rtf.format(-Math.round(minutes / 1440), 'day')
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
