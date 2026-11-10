import { Clock3, MapPin, Users } from 'lucide-react'
import { EmptyState } from '../../components/ui/States'
import { formatTime } from '../../lib/dates'
import type { Meeting } from '../../types'

type Props = {
  meetings: Meeting[]
  timeZone: string
  onSelect: (meeting: Meeting) => void
  emptyMessage?: string
}

/** Chronological meeting list with date badges. Used by the calendar sidebar, meetings page and dashboard. */
export function AgendaList({ meetings, timeZone, onSelect, emptyMessage }: Props) {
  if (meetings.length === 0) {
    return (
      <EmptyState
        title="No meetings"
        message={emptyMessage ?? 'Nothing is scheduled for this period.'}
      />
    )
  }
  const day = new Intl.DateTimeFormat(undefined, { day: '2-digit', timeZone })
  const month = new Intl.DateTimeFormat(undefined, { month: 'short', timeZone })
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone })

  return (
    <ul className="agenda-list">
      {meetings.map((meeting) => (
        <li key={meeting.id}>
          <button type="button" className="agenda-item" onClick={() => onSelect(meeting)}>
            <span className={`agenda-date tone-${meeting.tone}`} aria-hidden="true">
              <b>{day.format(new Date(meeting.startsAt))}</b>
              <span>{month.format(new Date(meeting.startsAt)).toUpperCase()}</span>
            </span>
            <span className="agenda-info">
              <span className="agenda-title">
                {meeting.title}
                <span className={`type-chip tone-${meeting.tone}`}>{meeting.typeName}</span>
              </span>
              <span>
                <Clock3 size={13} aria-hidden />
                {weekday.format(new Date(meeting.startsAt))} ·{' '}
                {formatTime(meeting.startsAt, timeZone)} – {formatTime(meeting.endsAt, timeZone)}
              </span>
              {meeting.location && (
                <span>
                  <MapPin size={13} aria-hidden />
                  {meeting.location}
                </span>
              )}
              <span>
                <Users size={13} aria-hidden />
                {meeting.participantIds.length} participants
                {meeting.projectName && ` · ${meeting.projectName}`}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
