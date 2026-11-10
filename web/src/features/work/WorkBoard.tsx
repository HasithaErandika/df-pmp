import { useState } from 'react'
import { Avatar, PriorityLabel } from '../../components/ui/Badges'
import { useConfig, useStatusTone } from '../../context/ConfigContext'
import { useSession } from '../../context/SessionContext'
import { useToast } from '../../context/ToastContext'
import { invalidate } from '../../hooks/useQuery'
import { api } from '../../lib/api'
import { formatDate, isOverdue } from '../../lib/dates'
import type { WorkItem } from '../../types'

type Props = { items: WorkItem[]; onSelect: (item: WorkItem) => void }

/**
 * Kanban board with one column per configured status. Cards move by drag and drop,
 * or by keyboard through the status select on each card.
 */
export function WorkBoard({ items, onSelect }: Props) {
  const { workflow } = useConfig()
  const { can } = useSession()
  const toneFor = useStatusTone()
  const notify = useToast()
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const editable = can('work:update')

  const move = async (item: WorkItem, status: string) => {
    if (item.status === status) return
    try {
      const { projectId, subject, type, priority, assigneeId, dueDate } = item
      await api.workItems.update(item.id, {
        projectId,
        subject,
        type,
        priority,
        assigneeId,
        dueDate,
        status,
      })
      invalidate('work-items', 'projects', 'project:', 'dashboard', 'activity:')
      notify(`${item.id} moved to ${status}.`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to move the item.', 'error')
    }
  }

  return (
    <div className="board" role="list" aria-label="Work board">
      {workflow.workItemStatuses.map((status) => {
        const cards = items.filter((item) => item.status === status)
        return (
          <section
            key={status}
            role="listitem"
            aria-label={`${status}, ${cards.length} items`}
            className={`board-column ${over === status ? 'drop-target' : ''}`}
            onDragOver={(event) => {
              if (!editable || !dragging) return
              event.preventDefault()
              setOver(status)
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(event) => {
              event.preventDefault()
              const item = items.find((i) => i.id === dragging)
              setOver(null)
              setDragging(null)
              if (item) void move(item, status)
            }}
          >
            <header className="board-column-head">
              <span className={`board-dot tone-${toneFor(status)}`} aria-hidden="true" />
              <h3>{status}</h3>
              <span className="count-pill">{cards.length}</span>
            </header>
            <div className="board-cards">
              {cards.map((item) => (
                <article
                  key={item.id}
                  className={`board-card ${dragging === item.id ? 'dragging' : ''}`}
                  draggable={editable}
                  onDragStart={() => setDragging(item.id)}
                  onDragEnd={() => setDragging(null)}
                >
                  <button type="button" className="board-card-title" onClick={() => onSelect(item)}>
                    {item.subject}
                  </button>
                  <div className="board-card-meta">
                    <span className="mono-label">{item.id}</span>
                    <span className="board-project">{item.projectName}</span>
                  </div>
                  <div className="board-card-foot">
                    <PriorityLabel priority={item.priority} />
                    <span className={isOverdue(item.dueDate, item.status) ? 'overdue' : 'muted'}>
                      {formatDate(item.dueDate)}
                    </span>
                    {item.assigneeName && <Avatar name={item.assigneeName} size="sm" />}
                  </div>
                  {editable && (
                    <select
                      className="board-move"
                      aria-label={`Move ${item.id} to status`}
                      value={item.status}
                      onChange={(event) => void move(item, event.target.value)}
                    >
                      {workflow.workItemStatuses.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  )}
                </article>
              ))}
              {cards.length === 0 && <p className="board-empty">Drop work here</p>}
            </div>
          </section>
        )
      })}
    </div>
  )
}
