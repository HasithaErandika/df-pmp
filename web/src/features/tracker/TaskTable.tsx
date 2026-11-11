import { StatusPill } from '../../components/ui/Badges'
import { Pagination, usePagination } from '../../components/ui/Pagination'
import { EmptyState } from '../../components/ui/States'
import type { TrackerTask } from '../../types'
import { Owners, TargetDate } from './TargetDate'

type Props = {
  tasks: TrackerTask[]
  done: string
  onSelect: (task: TrackerTask) => void
}

/** Tracker task table: one row per task with owners, status, target health and latest remark. */
export function TaskTable({ tasks, done, onSelect }: Props) {
  const { rows, meta, setPage, setPageSize } = usePagination(tasks, 20)
  if (tasks.length === 0) {
    return <EmptyState title="No tasks" message="Nothing matches the current filters." />
  }
  return (
    <>
      <div className="table-wrap">
        <table className="tracker-table">
          <thead>
            <tr>
              <th scope="col" className="col-ref">
                #
              </th>
              <th scope="col">Task</th>
              <th scope="col">Owners</th>
              <th scope="col">Status</th>
              <th scope="col">Target</th>
              <th scope="col">Latest remark</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((task) => (
              <tr key={task.id} className={task.status === done ? 'row-done' : ''}>
                <td className="col-ref mono-label">{task.refNo ?? '—'}</td>
                <td className="col-task">
                  <button type="button" className="link-button" onClick={() => onSelect(task)}>
                    {task.title}
                  </button>
                  <small>
                    {task.id}
                    {task.buOwner && (
                      <>
                        <span aria-hidden="true"> · </span>BU/PO {task.buOwner}
                      </>
                    )}
                  </small>
                </td>
                <td>
                  <Owners owners={task.owners} />
                </td>
                <td>
                  <StatusPill status={task.status} />
                </td>
                <td>
                  <TargetDate task={task} done={done} />
                </td>
                <td className="col-remark" title={task.remarks}>
                  {task.remarks || <span className="muted">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {meta.total > 10 && <Pagination meta={meta} onPage={setPage} onPageSize={setPageSize} />}
    </>
  )
}
