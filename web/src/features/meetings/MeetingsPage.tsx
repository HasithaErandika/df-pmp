import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { FilterTabs, matches } from '../../components/ui/Filters'
import { PageHeading } from '../../components/ui/PageHeading'
import { Pagination, usePagination } from '../../components/ui/Pagination'
import { Panel } from '../../components/ui/Panel'
import { QueryView, Skeleton } from '../../components/ui/States'
import { useConfig } from '../../context/ConfigContext'
import { useSession } from '../../context/SessionContext'
import { useQuery } from '../../hooks/useQuery'
import { useMeetingTypes } from '../../hooks/useReferenceData'
import { api } from '../../lib/api'
import { addDays, today } from '../../lib/dates'
import type { Meeting } from '../../types'
import { AgendaList } from './AgendaList'
import { MeetingFormDialog } from './MeetingFormDialog'

const ranges = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past 90 days' },
]

/** Meeting register: upcoming or recent meetings filtered by configured meeting type. */
export default function MeetingsPage() {
  const { timezone } = useConfig()
  const { can } = useSession()
  const types = useMeetingTypes()
  const [params] = useSearchParams()
  const search = params.get('q') ?? ''
  const [range, setRange] = useState('upcoming')
  const [type, setType] = useState('all')
  const [editing, setEditing] = useState<Meeting | 'new' | null>(null)
  const period =
    range === 'upcoming'
      ? { from: today(), to: addDays(today(), 180) }
      : { from: addDays(today(), -90), to: addDays(today(), -1) }
  const meetings = useQuery(`meetings:${period.from}:${period.to}`, (signal) =>
    api.meetings.list(period, signal),
  )
  const typeOptions = [
    { value: 'all', label: 'All types' },
    ...(types.data ?? []).map((t) => ({ value: t.id, label: t.name })),
  ]

  return (
    <>
      <PageHeading
        kicker="MEETING MANAGEMENT"
        title="Meetings"
        description="ITSSC, Operations and other configured meeting types, with participants and agendas."
        actions={
          can('meeting:create') && (
            <Button icon={Plus} onClick={() => setEditing('new')}>
              Schedule meeting
            </Button>
          )
        }
      />
      <Panel>
        <div className="work-toolbar">
          <FilterTabs label="Period" options={ranges} value={range} onChange={setRange} />
          <FilterTabs label="Meeting type" options={typeOptions} value={type} onChange={setType} />
        </div>
        <QueryView query={meetings} skeleton={<Skeleton rows={4} height={70} />}>
          {(list) => {
            const visible = list
              .filter(
                (m) =>
                  (type === 'all' || m.typeId === type) &&
                  matches(search, m.title, m.projectName, m.location),
              )
              .sort((a, b) =>
                range === 'past'
                  ? b.startsAt.localeCompare(a.startsAt)
                  : a.startsAt.localeCompare(b.startsAt),
              )
            return <PagedAgenda meetings={visible} timeZone={timezone} onSelect={setEditing} />
          }}
        </QueryView>
      </Panel>
      <MeetingFormDialog
        open={editing !== null}
        meeting={editing && editing !== 'new' ? editing : undefined}
        onClose={() => setEditing(null)}
      />
    </>
  )
}

function PagedAgenda({
  meetings,
  timeZone,
  onSelect,
}: {
  meetings: Meeting[]
  timeZone: string
  onSelect: (m: Meeting) => void
}) {
  const { rows, meta, setPage, setPageSize } = usePagination(meetings, 10)
  return (
    <>
      <AgendaList
        meetings={rows}
        timeZone={timeZone}
        onSelect={onSelect}
        emptyMessage="No meetings match these filters."
      />
      <Pagination meta={meta} onPage={setPage} onPageSize={setPageSize} />
    </>
  )
}
