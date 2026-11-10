import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button, IconButton } from '../../components/ui/Button'
import { matches } from '../../components/ui/Filters'
import { PageHeading } from '../../components/ui/PageHeading'
import { QueryView, Skeleton } from '../../components/ui/States'
import { useConfig } from '../../context/ConfigContext'
import { useSession } from '../../context/SessionContext'
import { useQuery } from '../../hooks/useQuery'
import { useMeetingTypes } from '../../hooks/useReferenceData'
import { api } from '../../lib/api'
import { toISODate } from '../../lib/dates'
import type { Meeting } from '../../types'
import { AgendaList } from './AgendaList'
import { CalendarGrid } from './CalendarGrid'
import { MeetingFormDialog } from './MeetingFormDialog'

type Editing = { meeting?: Meeting; date?: string } | null

export default function CalendarPage() {
  const { timezone } = useConfig()
  const { can } = useSession()
  const types = useMeetingTypes()
  const [params] = useSearchParams()
  const search = params.get('q') ?? ''
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )
  const [type, setType] = useState('')
  const [editing, setEditing] = useState<Editing>(null)
  const from = toISODate(month)
  const to = toISODate(new Date(month.getFullYear(), month.getMonth() + 1, 0))
  const meetings = useQuery(`meetings:${from}:${to}`, (signal) =>
    api.meetings.list({ from, to }, signal),
  )
  const shift = (delta: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1))
  const monthName = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
    month,
  )
  const canSchedule = can('meeting:create')

  const filter = (list: Meeting[]) =>
    list.filter(
      (m) =>
        (!type || m.typeId === type) &&
        matches(search, m.title, m.typeName, m.projectName, m.location),
    )

  return (
    <>
      <PageHeading
        kicker="SCHEDULE"
        title="Calendar"
        description="Meetings and governance sessions across your projects."
        actions={
          canSchedule && (
            <Button icon={Plus} onClick={() => setEditing({})}>
              Schedule meeting
            </Button>
          )
        }
      />
      <div className="calendar-layout">
        <section className="panel calendar-panel" aria-label={`Calendar for ${monthName}`}>
          <div className="calendar-toolbar">
            <div className="calendar-month">
              <IconButton icon={ChevronLeft} label="Previous month" onClick={() => shift(-1)} />
              <h2 aria-live="polite">{monthName}</h2>
              <IconButton icon={ChevronRight} label="Next month" onClick={() => shift(1)} />
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
                }
              >
                Today
              </Button>
            </div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Filter by meeting type"
            >
              <option value="">All types</option>
              {(types.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <QueryView query={meetings} skeleton={<Skeleton rows={5} height={80} />}>
            {(list) => (
              <CalendarGrid
                month={month}
                meetings={filter(list)}
                timeZone={timezone}
                onSelectMeeting={(meeting) => setEditing({ meeting })}
                onSelectDay={canSchedule ? (date) => setEditing({ date }) : undefined}
              />
            )}
          </QueryView>
        </section>
        <aside className="panel agenda-panel" aria-label="Month agenda">
          <div className="agenda-heading">
            <div className="section-kicker">MONTH AGENDA</div>
            <h2>{monthName}</h2>
            <p>{meetings.data ? `${filter(meetings.data).length} scheduled` : 'Loading…'}</p>
          </div>
          <QueryView query={meetings}>
            {(list) => (
              <AgendaList
                meetings={filter(list)}
                timeZone={timezone}
                onSelect={(meeting) => setEditing({ meeting })}
              />
            )}
          </QueryView>
        </aside>
      </div>
      <MeetingFormDialog
        open={editing !== null}
        meeting={editing?.meeting}
        date={editing?.date}
        onClose={() => setEditing(null)}
      />
    </>
  )
}
