import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/ui/States'
import { parseISODate } from '../../lib/dates'
import type { Project } from '../../types'

const MONTHS_SHOWN = 6
const DAY = 86_400_000

/** Gantt-style overview of project schedules from last month through the next few months. */
export function ProjectTimeline({ projects }: { projects: Project[] }) {
  const now = new Date()
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() - 1 + MONTHS_SHOWN, 1)
  const totalDays = (rangeEnd.getTime() - rangeStart.getTime()) / DAY
  const months = Array.from(
    { length: MONTHS_SHOWN },
    (_, index) => new Date(rangeStart.getFullYear(), rangeStart.getMonth() + index, 1),
  )
  const offset = (date: Date) =>
    Math.max(0, Math.min(100, ((date.getTime() - rangeStart.getTime()) / DAY / totalDays) * 100))
  const todayOffset = offset(now)
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit' })

  if (projects.length === 0) {
    return (
      <EmptyState
        title="No projects to show"
        message="Projects appear here once they are scheduled."
      />
    )
  }

  return (
    <div className="timeline-scroll">
      <div className="timeline-grid" style={{ ['--months' as string]: MONTHS_SHOWN }}>
        <div className="timeline-axis">
          <div className="timeline-label-head">PROJECT</div>
          <div className="timeline-months">
            {months.map((month) => (
              <div className="timeline-month" key={month.toISOString()}>
                {monthLabel.format(month)}
              </div>
            ))}
          </div>
        </div>
        {projects.map((project) => {
          const left = offset(parseISODate(project.startDate))
          const right = offset(parseISODate(project.endDate))
          return (
            <div className="timeline-row" key={project.id}>
              <Link className="timeline-project" to={`/projects/${project.id}`}>
                <span className={`project-dot fill-${project.tone}`} aria-hidden="true" />
                <span>
                  <b>{project.name}</b>
                  <small>{project.id}</small>
                </span>
              </Link>
              <div className="timeline-lane">
                <div className="timeline-month-lines" aria-hidden="true">
                  {months.map((month) => (
                    <i key={month.toISOString()} />
                  ))}
                </div>
                <span
                  className="timeline-today"
                  style={{ left: `${todayOffset}%` }}
                  aria-hidden="true"
                />
                <div
                  className={`timeline-bar bar-${project.tone}`}
                  style={{ left: `${left}%`, width: `${Math.max(2, right - left)}%` }}
                  title={`${project.startDate} → ${project.endDate} · ${project.progress}% complete`}
                  role="img"
                  aria-label={`${project.name}: ${project.startDate} to ${project.endDate}, ${project.progress}% complete`}
                >
                  <span style={{ width: `${project.progress}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
