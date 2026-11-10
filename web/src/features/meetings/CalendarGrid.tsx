import { toISODate, today, zonedParts } from '../../lib/dates'
import type { Meeting, OutlookEvent } from '../../types'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type Props = {
  month: Date
  meetings: Meeting[]
  timeZone: string
  onSelectMeeting: (meeting: Meeting) => void
  onSelectDay?: (date: string) => void
  outlookEvents?: OutlookEvent[]
}

/** Month grid. Days are buttons (to schedule) and events are buttons (to open), both keyboard reachable. */
export function CalendarGrid({
  month,
  meetings,
  timeZone,
  onSelectMeeting,
  onSelectDay,
  outlookEvents = [],
}: Props) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const leading = new Date(year, monthIndex, 1).getDay()
  const dayCount = new Date(year, monthIndex + 1, 0).getDate()
  const cells = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: dayCount }, (_, i) => toISODate(new Date(year, monthIndex, i + 1))),
  ]
  const byDay = new Map<string, Meeting[]>()
  meetings.forEach((meeting) => {
    const day = zonedParts(meeting.startsAt, timeZone).date
    byDay.set(day, [...(byDay.get(day) ?? []), meeting])
  })
  const outlookByDay = new Map<string, OutlookEvent[]>()
  outlookEvents.forEach((event) => {
    const day = zonedParts(event.startsAt, timeZone).date
    outlookByDay.set(day, [...(outlookByDay.get(day) ?? []), event])
  })
  const current = today()

  return (
    <div className="calendar-grid">
      <div className="calendar-weekdays" aria-hidden="true">
        {weekdays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-days">
        {cells.map((date, index) =>
          date === null ? (
            <div className="calendar-day empty-day" key={`empty-${index}`} />
          ) : (
            <div className={`calendar-day ${date === current ? 'today' : ''}`} key={date}>
              <button
                type="button"
                className="day-number"
                aria-label={`${date}${onSelectDay ? ', schedule a meeting' : ''}`}
                onClick={() => onSelectDay?.(date)}
                disabled={!onSelectDay}
              >
                {Number(date.slice(8))}
              </button>
              <div className="day-events">
                {(byDay.get(date) ?? []).map((meeting) => (
                  <button
                    type="button"
                    key={meeting.id}
                    title={`${meeting.title} · ${zonedParts(meeting.startsAt, timeZone).time}`}
                    className={`calendar-event event-${meeting.tone}`}
                    onClick={() => onSelectMeeting(meeting)}
                  >
                    <span className="event-time">
                      {zonedParts(meeting.startsAt, timeZone).time}
                    </span>
                    {meeting.title}
                  </button>
                ))}
                {(outlookByDay.get(date) ?? []).map((event) => (
                  <a
                    key={event.id}
                    href={event.webLink}
                    target="_blank"
                    rel="noreferrer"
                    className="calendar-event event-outlook"
                    title={`Outlook: ${event.subject} · ${zonedParts(event.startsAt, timeZone).time}`}
                  >
                    <span className="event-time">{zonedParts(event.startsAt, timeZone).time}</span>
                    {event.subject || '(No title)'}
                  </a>
                ))}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
