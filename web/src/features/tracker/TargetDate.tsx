import { History } from 'lucide-react'
import { formatDate } from '../../lib/dates'
import type { TrackerTask } from '../../types'
import { isDueSoon, isTaskOverdue, slips } from './tracker'

const long = (value: string) => formatDate(value, { year: 'numeric' })

/** Current target with overdue / due-soon cues and how often it has slipped. */
export function TargetDate({ task, done }: { task: TrackerTask; done: string }) {
  const overdue = isTaskOverdue(task, done)
  const moved = slips(task)
  return (
    <span className="target-date">
      {task.targetDate ? (
        <span className={overdue ? 'overdue' : isDueSoon(task, done) ? 'due-soon' : ''}>
          {long(task.targetDate)}
        </span>
      ) : (
        <span className="muted">TBD</span>
      )}
      {overdue && <span className="overdue-tag">Overdue</span>}
      {moved > 0 && (
        <span
          className="slip-chip"
          title={`Earlier targets: ${task.targetHistory.map(long).join(' → ')}`}
        >
          <History size={11} aria-hidden />
          Moved {moved}×
        </span>
      )}
    </span>
  )
}

/** Compact list of owner avatars and names. */
export function Owners({ owners, max = 3 }: { owners: string[]; max?: number }) {
  if (owners.length === 0) return <span className="muted">Unassigned</span>
  const shown = owners.slice(0, max)
  return (
    <span className="owner-list" title={owners.join(', ')}>
      {shown.join(', ')}
      {owners.length > max && <span className="muted"> +{owners.length - max}</span>}
    </span>
  )
}
