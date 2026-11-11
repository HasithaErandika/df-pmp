import { useState } from 'react'
import { useStatusTone } from '../../context/ConfigContext'
import type { TrackerTask } from '../../types'
import { Owners, TargetDate } from './TargetDate'

type Props = {
  tasks: TrackerTask[]
  statuses: string[]
  done: string
  editable: boolean
  onSelect: (task: TrackerTask) => void
  onMove: (task: TrackerTask, status: string) => void
}

/** Status board for tracker tasks. Cards move by drag and drop or the status select on each card. */
export function TaskKanban({ tasks, statuses, done, editable, onSelect, onMove }: Props) {
  const toneFor = useStatusTone()
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)

  return (
    <div className="board tracker-board" role="list" aria-label="Task board">
      {statuses.map((status) => {
        const cards = tasks.filter((t) => t.status === status)
        return (
          <section
            key={status}
            role="listitem"
            aria-label={`${status}, ${cards.length} tasks`}
            className={`board-column ${over === status ? 'drop-target' : ''}`}
            onDragOver={(event) => {
              if (!editable || !dragging) return
              event.preventDefault()
              setOver(status)
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(event) => {
              event.preventDefault()
              const task = tasks.find((t) => t.id === dragging)
              setOver(null)
              setDragging(null)
              if (task && task.status !== status) onMove(task, status)
            }}
          >
            <header className="board-column-head">
              <span className={`board-dot tone-${toneFor(status)}`} aria-hidden="true" />
              <h3>{status}</h3>
              <span className="count-pill">{cards.length}</span>
            </header>
            <div className="board-cards">
              {cards.map((task) => (
                <article
                  key={task.id}
                  className={`board-card ${dragging === task.id ? 'dragging' : ''}`}
                  draggable={editable}
                  onDragStart={() => setDragging(task.id)}
                  onDragEnd={() => setDragging(null)}
                >
                  <button type="button" className="board-card-title" onClick={() => onSelect(task)}>
                    {task.title}
                  </button>
                  <div className="board-card-meta">
                    <span className="mono-label">{task.id}</span>
                    <Owners owners={task.owners} max={2} />
                  </div>
                  <TargetDate task={task} done={done} />
                  {editable && (
                    <select
                      className="board-move"
                      aria-label={`Move ${task.id} to status`}
                      value={task.status}
                      onChange={(event) => onMove(task, event.target.value)}
                    >
                      {statuses.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  )}
                </article>
              ))}
              {cards.length === 0 && <p className="board-empty">No tasks</p>}
            </div>
          </section>
        )
      })}
    </div>
  )
}
