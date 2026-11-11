import { AlarmClock, CalendarClock, CheckCircle2, History } from 'lucide-react'
import { MetricCard } from '../../components/ui/MetricCard'
import { useStatusTone } from '../../context/ConfigContext'
import type { TrackerTask } from '../../types'
import { DUE_SOON_DAYS, summarize, type TaskFilter } from './tracker'

type Props = {
  tasks: TrackerTask[]
  statuses: string[]
  done: string
  filter: TaskFilter
  onFilter: (filter: TaskFilter) => void
}

/** KPI tiles plus a status distribution bar; segments and tiles act as quick filters. */
export function TrackerSummary({ tasks, statuses, done, filter, onFilter }: Props) {
  const toneFor = useStatusTone()
  const s = summarize(tasks, done)
  const toggle = (next: TaskFilter) => onFilter(filter === next ? 'open' : next)
  const counts = statuses.map((status) => ({
    status,
    count: tasks.filter((t) => t.status === status).length,
  }))

  return (
    <>
      <div className="metric-grid tracker-metrics">
        <MetricCard
          label="Completed"
          value={s.completed}
          detail={`${s.percent}% of ${s.total} tasks`}
          icon={CheckCircle2}
          tone="green"
          active={filter === `status:${done}`}
          onClick={() => toggle(`status:${done}`)}
        />
        {(
          [
            ['overdue', 'Overdue', s.overdue, 'Past target, not completed', AlarmClock, 'red'],
            [
              'due-soon',
              'Due soon',
              s.dueSoon,
              `Target within ${DUE_SOON_DAYS} days`,
              CalendarClock,
              'gold',
            ],
            [
              'slipped',
              'Slipped targets',
              s.slipped,
              'Open tasks with a moved target',
              History,
              'purple',
            ],
          ] as const
        ).map(([key, label, value, detail, icon, tone]) => (
          <MetricCard
            key={key}
            label={label}
            value={value}
            detail={detail}
            icon={icon}
            tone={tone}
            active={filter === key}
            onClick={() => toggle(key)}
          />
        ))}
      </div>

      <div className="status-strip" aria-label="Tasks by status">
        <div className="status-strip-bar" aria-hidden="true">
          {counts.map(({ status, count }) =>
            count ? (
              <span
                key={status}
                className={`fill-${toneFor(status)}`}
                style={{ flexGrow: count }}
                title={`${status}: ${count}`}
              />
            ) : null,
          )}
        </div>
        <div className="status-strip-legend">
          {counts.map(({ status, count }) => (
            <button
              key={status}
              type="button"
              aria-pressed={filter === `status:${status}`}
              className={filter === `status:${status}` ? 'active' : ''}
              onClick={() => toggle(`status:${status}`)}
            >
              <i className={`fill-${toneFor(status)}`} aria-hidden="true" />
              {status}
              <b className="tabular">{count}</b>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
