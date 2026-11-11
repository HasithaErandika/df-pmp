import { useState } from 'react'
import { CalendarCheck2, CalendarDays, Rocket, ShieldAlert, Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { matches, SearchInput } from '../../components/ui/Filters'
import { MetricCard } from '../../components/ui/MetricCard'
import { Panel } from '../../components/ui/Panel'
import { QueryView, Skeleton } from '../../components/ui/States'
import { useConfig } from '../../context/ConfigContext'
import { useSession } from '../../context/SessionContext'
import { useQuery } from '../../hooks/useQuery'
import { trackerApi } from '../../lib/trackerApi'
import type { Release } from '../../types'
import { ReleaseFormDialog } from './ReleaseFormDialog'
import { ReleaseList } from './ReleaseList'
import { releaseStats } from './releases'

/** Weekly release calendar: summary, filters and the grouped list. */
export function ReleasesView() {
  const { workflow } = useConfig()
  const { can } = useSession()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Release | 'new' | null>(null)
  const releases = useQuery('tracker-releases', trackerApi.releases.list)

  return (
    <QueryView query={releases} skeleton={<Skeleton rows={6} height={56} />}>
      {(all) => {
        const s = releaseStats(all)
        const visible = all.filter(
          (r) =>
            (!type || r.type === type) &&
            (!status || r.status === status) &&
            matches(search, r.id, r.title, r.systems, r.techOwner, r.buSpoc, r.qaSpoc, r.notes),
        )
        return (
          <>
            <div className="metric-grid">
              <MetricCard
                label="This week"
                value={s.thisWeek}
                detail="Releases scheduled Mon–Sun"
                icon={CalendarDays}
                tone="blue"
              />
              <MetricCard
                label="Upcoming"
                value={s.upcoming}
                detail="Planned from today"
                icon={Rocket}
                tone="purple"
              />
              <MetricCard
                label="Released this month"
                value={s.releasedThisMonth}
                detail="Completed deployments"
                icon={CalendarCheck2}
                tone="green"
              />
              <MetricCard
                label="VA fix releases"
                value={s.security}
                detail={`${all.length ? Math.round((s.security / all.length) * 100) : 0}% of all releases`}
                icon={ShieldAlert}
                tone="red"
              />
            </div>
            <Panel className="work-panel">
              <div className="work-toolbar">
                <div className="toolbar-group">
                  <SearchInput label="Search releases" value={search} onChange={setSearch} />
                  <label className="inline-select">
                    <span>Type</span>
                    <select value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="">All types</option>
                      {workflow.releaseTypes.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="inline-select">
                    <span>Status</span>
                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="">Any status</option>
                      {workflow.releaseStatuses.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {can('tracker:create') && (
                  <Button icon={Plus} onClick={() => setEditing('new')}>
                    New release
                  </Button>
                )}
              </div>
              <ReleaseList releases={visible} onSelect={setEditing} />
            </Panel>
            <ReleaseFormDialog
              open={editing !== null}
              release={editing && editing !== 'new' ? editing : undefined}
              onClose={() => setEditing(null)}
            />
          </>
        )
      }}
    </QueryView>
  )
}
