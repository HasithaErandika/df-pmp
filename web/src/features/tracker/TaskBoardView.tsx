import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { FilterTabs, matches, SearchInput } from '../../components/ui/Filters'
import { Panel } from '../../components/ui/Panel'
import { QueryView, Skeleton } from '../../components/ui/States'
import { useConfig } from '../../context/ConfigContext'
import { useSession } from '../../context/SessionContext'
import { useToast } from '../../context/ToastContext'
import { invalidate, useQuery } from '../../hooks/useQuery'
import { useStoredState } from '../../hooks/useStoredState'
import { trackerApi } from '../../lib/trackerApi'
import type { TrackerTask } from '../../types'
import { TaskDialog } from './TaskDialog'
import { TaskKanban } from './TaskKanban'
import { TaskTable } from './TaskTable'
import { TrackerSummary } from './TrackerSummary'
import * as t from './tracker'

const views = [
  { value: 'table', label: 'Table' },
  { value: 'board', label: 'Board' },
]
const filters: { value: t.TaskFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'all', label: 'All tasks' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due-soon', label: 'Due soon' },
  { value: 'slipped', label: 'Slipped' },
]

/** One tracker board (e.g. Fintech): health summary, filters and a table or status board. */
export function TaskBoardView({ board }: { board: string }) {
  const { workflow } = useConfig()
  const { can } = useSession()
  const notify = useToast()
  const statuses = workflow.trackerStatuses
  const done = t.doneStatus(statuses)
  const [filter, setFilter] = useState<t.TaskFilter>('open')
  const [owner, setOwner] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useStoredState<t.TaskSort>('df-pmp-tracker-sort', 'tracker')
  const [view, setView] = useStoredState('df-pmp-tracker-view', 'table')
  const [editing, setEditing] = useState<TrackerTask | 'new' | null>(null)
  const tasks = useQuery(`tracker-tasks:${board}`, (signal) => trackerApi.tasks(board, signal))

  const move = async (task: TrackerTask, status: string) => {
    try {
      await trackerApi.update(task.id, { ...t.toInput(task), status })
      invalidate(...t.refreshTracker())
      notify(`${task.id} moved to ${status}.`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to move the task.', 'error')
    }
  }

  return (
    <QueryView query={tasks} skeleton={<Skeleton rows={6} height={64} />}>
      {(all) => {
        const visible = t.sortTasks(
          all.filter(
            (task) =>
              (view === 'board' || t.filterTask(task, filter, done)) &&
              (!owner || task.owners.includes(owner)) &&
              matches(
                search,
                task.id,
                task.refNo,
                task.title,
                task.buOwner,
                task.remarks,
                ...task.owners,
              ),
          ),
          sort,
        )
        return (
          <>
            <TrackerSummary
              tasks={all}
              statuses={statuses}
              done={done}
              filter={filter}
              onFilter={setFilter}
            />
            <Panel className="work-panel">
              <div className="work-toolbar">
                <div className="toolbar-group">
                  <SearchInput label="Search tasks" value={search} onChange={setSearch} />
                  {view === 'table' && (
                    <label className="inline-select">
                      <span>Show</span>
                      <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as t.TaskFilter)}
                      >
                        {filters.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                        {statuses.map((s) => (
                          <option key={s} value={`status:${s}`}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="inline-select">
                    <span>Owner</span>
                    <select value={owner} onChange={(e) => setOwner(e.target.value)}>
                      <option value="">Everyone</option>
                      {t.ownerNames(all).map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="inline-select">
                    <span>Sort</span>
                    <select value={sort} onChange={(e) => setSort(e.target.value as t.TaskSort)}>
                      <option value="tracker">Tracker order</option>
                      <option value="target">Target date</option>
                      <option value="updated">Recently updated</option>
                    </select>
                  </label>
                </div>
                <div className="toolbar-group">
                  <FilterTabs label="View" options={views} value={view} onChange={setView} />
                  {can('tracker:create') && (
                    <Button icon={Plus} onClick={() => setEditing('new')}>
                      New task
                    </Button>
                  )}
                </div>
              </div>
              {view === 'board' ? (
                <TaskKanban
                  tasks={visible}
                  statuses={statuses}
                  done={done}
                  editable={can('tracker:update')}
                  onSelect={setEditing}
                  onMove={(task, status) => void move(task, status)}
                />
              ) : (
                <TaskTable tasks={visible} done={done} onSelect={setEditing} />
              )}
            </Panel>
            <TaskDialog
              board={board}
              task={
                editing && editing !== 'new'
                  ? (all.find((x) => x.id === editing.id) ?? editing)
                  : undefined
              }
              open={editing !== null}
              onClose={() => setEditing(null)}
            />
          </>
        )
      }}
    </QueryView>
  )
}
