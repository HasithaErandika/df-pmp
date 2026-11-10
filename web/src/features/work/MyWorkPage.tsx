import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { FilterTabs, matches } from '../../components/ui/Filters'
import { PageHeading } from '../../components/ui/PageHeading'
import { Panel } from '../../components/ui/Panel'
import { QueryView, Skeleton } from '../../components/ui/States'
import { useConfig } from '../../context/ConfigContext'
import { useSession } from '../../context/SessionContext'
import { useQuery } from '../../hooks/useQuery'
import { useStoredState } from '../../hooks/useStoredState'
import { api } from '../../lib/api'
import { isOverdue } from '../../lib/dates'
import type { WorkItem } from '../../types'
import { WorkItemFormDialog } from './WorkItemFormDialog'
import { WorkBoard } from './WorkBoard'
import { WorkTable } from './WorkTable'

const scopes = [
  { value: 'me', label: 'Assigned to me' },
  { value: 'all', label: 'All work' },
]
const views = [
  { value: 'table', label: 'Table' },
  { value: 'board', label: 'Board' },
]

export default function MyWorkPage() {
  const { workflow } = useConfig()
  const { can } = useSession()
  const [params] = useSearchParams()
  const search = params.get('q') ?? ''
  const [scope, setScope] = useState('me')
  const [status, setStatus] = useState('Open')
  const [view, setView] = useStoredState('df-pmp-work-view', 'table')
  const [editing, setEditing] = useState<WorkItem | 'new' | null>(null)
  const assignee = scope === 'me' ? 'me' : undefined
  const work = useQuery(`work-items:${scope}`, (signal) => api.workItems.list({ assignee }, signal))

  const statusFilter = (item: WorkItem) => {
    if (view === 'board') return true // the board shows every status as a column
    if (status === 'Open') return item.status !== 'Done'
    if (status === 'Overdue') return isOverdue(item.dueDate, item.status)
    return status === 'All' || item.status === status
  }

  return (
    <>
      <PageHeading
        kicker="PERSONAL WORKSPACE"
        title="My work"
        description="Tasks, actions and milestones with their due dates and owners."
        actions={
          can('work:create') && (
            <Button icon={Plus} onClick={() => setEditing('new')}>
              New work item
            </Button>
          )
        }
      />
      <Panel className="work-panel">
        <div className="work-toolbar">
          <FilterTabs label="Scope" options={scopes} value={scope} onChange={setScope} />
          <FilterTabs label="View" options={views} value={view} onChange={setView} />
          {view === 'table' && (
            <label className="inline-select">
              <span>Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {['Open', 'Overdue', 'All', ...workflow.workItemStatuses].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <QueryView query={work} skeleton={<Skeleton rows={5} />}>
          {(items) => {
            const visible = items.filter(
              (i) =>
                statusFilter(i) && matches(search, i.id, i.subject, i.projectName, i.assigneeName),
            )
            return view === 'board' ? (
              <WorkBoard items={visible} onSelect={setEditing} />
            ) : (
              <WorkTable
                items={visible}
                onSelect={setEditing}
                emptyMessage={
                  scope === 'me' ? 'You have no work matching these filters.' : undefined
                }
              />
            )
          }}
        </QueryView>
      </Panel>
      <WorkItemFormDialog
        open={editing !== null}
        item={editing && editing !== 'new' ? editing : undefined}
        onClose={() => setEditing(null)}
      />
    </>
  )
}
