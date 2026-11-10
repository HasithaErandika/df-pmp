import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  Plus,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { matches } from '../../components/ui/Filters'
import { MetricCard } from '../../components/ui/MetricCard'
import { PageHeading } from '../../components/ui/PageHeading'
import { Panel } from '../../components/ui/Panel'
import { QueryView, Skeleton } from '../../components/ui/States'
import { useConfig } from '../../context/ConfigContext'
import { useSession } from '../../context/SessionContext'
import { useQuery } from '../../hooks/useQuery'
import { useProjects } from '../../hooks/useReferenceData'
import { api } from '../../lib/api'
import { addDays, today } from '../../lib/dates'
import type { Meeting, WorkItem } from '../../types'
import { AgendaList } from '../meetings/AgendaList'
import { MeetingFormDialog } from '../meetings/MeetingFormDialog'
import { ProjectTimeline } from '../projects/ProjectTimeline'
import { WorkItemFormDialog } from '../work/WorkItemFormDialog'
import { WorkTable } from '../work/WorkTable'
import { InsightsRow } from './InsightsRow'

export default function DashboardPage() {
  const { timezone } = useConfig()
  const { session, can } = useSession()
  const [params] = useSearchParams()
  const search = params.get('q') ?? ''
  const [workItem, setWorkItem] = useState<WorkItem | 'new' | null>(null)
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const summary = useQuery('dashboard', api.dashboard)
  const projects = useProjects()
  const myWork = useQuery('work-items:me', (signal) =>
    api.workItems.list({ assignee: 'me' }, signal),
  )
  const range = { from: today(), to: addDays(today(), 14) }
  const meetings = useQuery(`meetings:${range.from}:${range.to}`, (signal) =>
    api.meetings.list(range, signal),
  )
  const s = summary.data
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  }).format(new Date())

  return (
    <>
      <PageHeading
        kicker={dateLabel.toUpperCase()}
        title={`Welcome back, ${session?.displayName.split(' ')[0] ?? ''}`}
        description="A clear view of delivery, decisions and upcoming work."
        actions={
          can('work:create') && (
            <Button icon={Plus} onClick={() => setWorkItem('new')}>
              New work item
            </Button>
          )
        }
      />
      <section className="metric-grid" aria-label="Portfolio summary">
        <MetricCard
          label="Active projects"
          value={s?.activeProjects}
          detail="Not yet completed"
          icon={FolderKanban}
          tone="blue"
          to="/projects"
        />
        <MetricCard
          label="Assigned to you"
          value={s?.assignedToMe}
          detail={`${s?.openWorkItems ?? '—'} open across the portfolio`}
          icon={ClipboardList}
          tone="red"
          to="/my-work"
        />
        <MetricCard
          label="Due this week"
          value={s?.dueThisWeek}
          detail={s?.overdue ? `${s.overdue} overdue` : 'Nothing overdue'}
          icon={CalendarDays}
          tone="gold"
          to="/my-work"
        />
        <MetricCard
          label="Completed this month"
          value={s?.completedThisMonth}
          detail={`${s?.upcomingMeetings ?? '—'} meetings in the next 7 days`}
          icon={CheckCircle2}
          tone="green"
        />
      </section>

      <InsightsRow />

      <Panel
        title="Project timeline"
        description="Schedule and delivery progress across projects."
        icon={Activity}
      >
        <QueryView query={projects} skeleton={<Skeleton rows={3} />}>
          {(items) => (
            <ProjectTimeline
              projects={items.filter((p) => matches(search, p.id, p.name, p.ownerName))}
            />
          )}
        </QueryView>
      </Panel>

      <div className="dashboard-split">
        <Panel
          title="My priority work"
          description="Open items assigned to you, soonest first."
          icon={ClipboardList}
          tone="red"
          count={myWork.data?.filter((i) => i.status !== 'Done').length}
          actions={
            <Link className="text-link" to="/my-work">
              View all
            </Link>
          }
        >
          <QueryView query={myWork}>
            {(items) => (
              <WorkTable
                items={items
                  .filter(
                    (i) => i.status !== 'Done' && matches(search, i.subject, i.projectName, i.id),
                  )
                  .slice(0, 5)}
                onSelect={setWorkItem}
                emptyMessage="You're all caught up."
                showAssignee={false}
              />
            )}
          </QueryView>
        </Panel>
        <Panel
          title="Upcoming meetings"
          description="Next two weeks."
          icon={CalendarDays}
          tone="turquoise"
          actions={
            <Link className="text-link" to="/meetings">
              View all
            </Link>
          }
        >
          <QueryView query={meetings}>
            {(list) => (
              <AgendaList meetings={list.slice(0, 4)} timeZone={timezone} onSelect={setMeeting} />
            )}
          </QueryView>
        </Panel>
      </div>

      <WorkItemFormDialog
        open={workItem !== null}
        item={workItem && workItem !== 'new' ? workItem : undefined}
        onClose={() => setWorkItem(null)}
      />
      <MeetingFormDialog
        open={meeting !== null}
        meeting={meeting ?? undefined}
        onClose={() => setMeeting(null)}
      />
    </>
  )
}
