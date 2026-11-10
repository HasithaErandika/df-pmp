import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Gauge, PieChart, Users } from 'lucide-react'
import { BarList } from '../../components/charts/BarList'
import { BulletBar } from '../../components/charts/BulletBar'
import { DonutChart } from '../../components/charts/DonutChart'
import { Panel } from '../../components/ui/Panel'
import { QueryView, Skeleton } from '../../components/ui/States'
import { useConfig } from '../../context/ConfigContext'
import { useQuery } from '../../hooks/useQuery'
import { useProjects } from '../../hooks/useReferenceData'
import { api } from '../../lib/api'
import { parseISODate } from '../../lib/dates'
import type { Project } from '../../types'

/** Fixed series order: colour follows the configured status position, never its rank. */
const seriesColors = [
  'var(--series-1)',
  'var(--series-2)',
  'var(--series-3)',
  'var(--series-4)',
  'var(--series-5)',
]
const AT_RISK_GAP = 10 // percentage points behind schedule before a project is flagged

/** Share of a project's schedule already elapsed, 0–100. */
function elapsed(project: Project) {
  const start = parseISODate(project.startDate).getTime()
  const end = parseISODate(project.endDate).getTime()
  if (end <= start) return 100
  return Math.max(0, Math.min(100, ((Date.now() - start) / (end - start)) * 100))
}

export function InsightsRow() {
  const { workflow } = useConfig()
  const work = useQuery('work-items:all', (signal) => api.workItems.list({}, signal))
  const projects = useProjects()

  return (
    <div className="insights-row">
      <Panel title="Work by status" description="All work items across projects." icon={PieChart}>
        <QueryView query={work} skeleton={<Skeleton rows={1} height={168} />}>
          {(items) => (
            <DonutChart
              totalLabel="work items"
              segments={workflow.workItemStatuses.map((status, index) => ({
                label: status,
                value: items.filter((i) => i.status === status).length,
                color: seriesColors[index % seriesColors.length],
              }))}
            />
          )}
        </QueryView>
      </Panel>

      <Panel
        title="Team workload"
        description="Open work items per person."
        icon={Users}
        tone="turquoise"
      >
        <QueryView query={work} skeleton={<Skeleton rows={4} height={20} />}>
          {(items) => {
            const counts = new Map<string, number>()
            items
              .filter((i) => i.status !== 'Done')
              .forEach((i) =>
                counts.set(
                  i.assigneeName || 'Unassigned',
                  (counts.get(i.assigneeName || 'Unassigned') ?? 0) + 1,
                ),
              )
            const data = [...counts.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([name, value]) => ({ key: name, label: name, value }))
            return data.length ? (
              <BarList data={data} unit="open items" />
            ) : (
              <p className="chart-empty">No open work.</p>
            )
          }}
        </QueryView>
      </Panel>

      <Panel
        title="Delivery health"
        description="Progress against schedule elapsed (tick)."
        icon={Gauge}
        tone="purple"
      >
        <QueryView query={projects} skeleton={<Skeleton rows={4} height={20} />}>
          {(items) => (
            <ul className="health-list">
              {items
                .filter((p) => p.status !== 'Done')
                .slice(0, 5)
                .map((project) => {
                  const expected = elapsed(project)
                  const behind = expected - project.progress > AT_RISK_GAP
                  return (
                    <li key={project.id}>
                      <Link to={`/projects/${project.id}`} className="health-name">
                        {project.name}
                      </Link>
                      <span className={`health-verdict ${behind ? 'behind' : 'on-track'}`}>
                        {behind ? (
                          <AlertTriangle size={13} aria-hidden />
                        ) : (
                          <CheckCircle2 size={13} aria-hidden />
                        )}
                        {behind ? 'Behind' : 'On track'}
                      </span>
                      <BulletBar
                        actual={project.progress}
                        expected={expected}
                        label={project.name}
                      />
                      <small className="tabular">
                        {project.progress}% done · {Math.round(expected)}% of time used
                      </small>
                    </li>
                  )
                })}
            </ul>
          )}
        </QueryView>
      </Panel>
    </div>
  )
}
