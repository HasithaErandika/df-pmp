import { CheckSquare, Diamond, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PriorityLabel, StatusPill } from '../../components/ui/Badges'
import { EmptyState } from '../../components/ui/States'
import { Pagination, usePagination } from '../../components/ui/Pagination'
import { formatDate, isOverdue } from '../../lib/dates'
import type { WorkItem } from '../../types'

const typeIcons: Record<string, typeof CheckSquare> = {
  Task: CheckSquare,
  Action: Zap,
  Milestone: Diamond,
}

type WorkTableProps = {
  items: WorkItem[]
  onSelect?: (item: WorkItem) => void
  showProject?: boolean
  emptyMessage?: string
  pageSize?: number
  showAssignee?: boolean
}

/** Work item table. Rows open the editor when `onSelect` is provided. */
export function WorkTable({
  items,
  onSelect,
  showProject = true,
  emptyMessage,
  pageSize = 10,
  showAssignee = true,
}: WorkTableProps) {
  const { rows, meta, setPage, setPageSize } = usePagination(items, pageSize)
  if (items.length === 0) {
    return (
      <EmptyState
        title="No work items"
        message={emptyMessage ?? 'Nothing matches the current filters.'}
      />
    )
  }
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Work item</th>
              {showProject && <th scope="col">Project</th>}
              <th scope="col">Status</th>
              <th scope="col">Priority</th>
              {showAssignee && <th scope="col">Assignee</th>}
              <th scope="col">Due</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const Icon = typeIcons[item.type] ?? CheckSquare
              const overdue = isOverdue(item.dueDate, item.status)
              return (
                <tr key={item.id} className={item.status === 'Done' ? 'row-done' : ''}>
                  <td>
                    <div className="work-title">
                      <span
                        className={`type-mark type-${item.type.toLowerCase()}`}
                        aria-hidden="true"
                      >
                        <Icon size={13} />
                      </span>
                      <div>
                        {onSelect ? (
                          <button
                            type="button"
                            className="link-button"
                            onClick={() => onSelect(item)}
                          >
                            {item.subject}
                          </button>
                        ) : (
                          <b>{item.subject}</b>
                        )}
                        <small>
                          {item.id}
                          <span aria-hidden="true">·</span>
                          {item.type}
                        </small>
                      </div>
                    </div>
                  </td>
                  {showProject && (
                    <td>
                      <Link to={`/projects/${item.projectId}`} className="subtle-link">
                        {item.projectName}
                      </Link>
                    </td>
                  )}
                  <td>
                    <StatusPill status={item.status} />
                  </td>
                  <td>
                    <PriorityLabel priority={item.priority} />
                  </td>
                  {showAssignee && (
                    <td>{item.assigneeName || <span className="muted">Unassigned</span>}</td>
                  )}
                  <td className={overdue ? 'overdue' : ''}>
                    {formatDate(item.dueDate)}
                    {overdue && <span className="overdue-tag">Overdue</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {meta.total > 10 && <Pagination meta={meta} onPage={setPage} onPageSize={setPageSize} />}
    </>
  )
}
