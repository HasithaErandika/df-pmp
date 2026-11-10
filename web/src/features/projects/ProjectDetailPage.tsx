import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react'
import { Avatar, ProgressBar, StatusPill } from '../../components/ui/Badges'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageHeading } from '../../components/ui/PageHeading'
import { Panel } from '../../components/ui/Panel'
import { EmptyState, QueryView, Skeleton } from '../../components/ui/States'
import { useSession } from '../../context/SessionContext'
import { useToast } from '../../context/ToastContext'
import { invalidate, useQuery } from '../../hooks/useQuery'
import { api, ApiError } from '../../lib/api'
import { formatDate } from '../../lib/dates'
import type { Project, WorkItem } from '../../types'
import { WorkItemFormDialog } from '../work/WorkItemFormDialog'
import { WorkTable } from '../work/WorkTable'
import { ActivityList } from './ActivityList'
import { DocumentsPanel } from './DocumentsPanel'
import { ProjectFormDialog } from './ProjectFormDialog'

export default function ProjectDetailPage() {
  const { id = '' } = useParams()
  const project = useQuery(`project:${id}`, (signal) => api.projects.get(id, signal))

  if (project.error instanceof ApiError && project.error.status === 404) {
    return (
      <EmptyState
        title="Project not found"
        message="It may have been deleted, or the link is incorrect."
        action={
          <Link to="/projects" className="button button-secondary button-md">
            Back to projects
          </Link>
        }
      />
    )
  }
  return (
    <QueryView query={project} skeleton={<Skeleton rows={3} height={120} />}>
      {(data) => <ProjectDetail project={data} />}
    </QueryView>
  )
}

function ProjectDetail({ project }: { project: Project }) {
  const { can } = useSession()
  const notify = useToast()
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<'edit' | 'delete' | 'work' | null>(null)
  const [selected, setSelected] = useState<WorkItem | undefined>()
  const work = useQuery(`work-items:project:${project.id}`, (signal) =>
    api.workItems.list({ projectId: project.id }, signal),
  )

  const remove = async () => {
    await api.projects.remove(project.id)
    invalidate('projects', 'work-items', 'dashboard')
    notify(`${project.name} deleted.`)
    navigate('/projects', { replace: true })
  }

  return (
    <>
      <Link to="/projects" className="back-link">
        <ArrowLeft size={14} aria-hidden /> All projects
      </Link>
      <PageHeading
        kicker={project.id}
        title={project.name}
        description={project.description || undefined}
        actions={
          <>
            {can('project:delete') && (
              <Button
                variant="ghost"
                icon={Trash2}
                className="danger-text"
                onClick={() => setDialog('delete')}
              >
                Delete
              </Button>
            )}
            {can('project:update') && (
              <Button variant="secondary" icon={Pencil} onClick={() => setDialog('edit')}>
                Edit
              </Button>
            )}
          </>
        }
      />
      <section className="detail-facts panel" aria-label="Project summary">
        <div>
          <small>STATUS</small>
          <StatusPill status={project.status} />
        </div>
        <div>
          <small>OWNER</small>
          <span className="owner">
            <Avatar name={project.ownerName} size="sm" />
            {project.ownerName}
          </span>
        </div>
        <div>
          <small>SCHEDULE</small>
          {formatDate(project.startDate, { year: 'numeric' })} –{' '}
          {formatDate(project.endDate, { year: 'numeric' })}
        </div>
        <div className="fact-progress">
          <small>PROGRESS · {project.progress}%</small>
          <ProgressBar value={project.progress} tone={project.tone} label="Project progress" />
        </div>
      </section>
      <div className="detail-layout">
        <Panel
          title="Work items"
          icon={ClipboardList}
          tone="red"
          count={work.data?.length}
          actions={
            can('work:create') && (
              <Button
                size="sm"
                icon={Plus}
                onClick={() => {
                  setSelected(undefined)
                  setDialog('work')
                }}
              >
                Add work item
              </Button>
            )
          }
        >
          <QueryView query={work}>
            {(items) => (
              <WorkTable
                items={items}
                showProject={false}
                onSelect={(item) => {
                  setSelected(item)
                  setDialog('work')
                }}
                emptyMessage="Break this project down into tasks, actions and milestones."
              />
            )}
          </QueryView>
        </Panel>
        <div className="detail-side">
          {can('document:view') && <DocumentsPanel projectId={project.id} />}
          {can('audit:view') && <ActivityList type="project" id={project.id} />}
        </div>
      </div>
      <ProjectFormDialog
        open={dialog === 'edit'}
        project={project}
        onClose={() => setDialog(null)}
      />
      <WorkItemFormDialog
        open={dialog === 'work'}
        item={selected}
        projectId={project.id}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        title="Delete project?"
        message={`${project.name} and its ${project.openItems} open work items will be permanently removed. Linked meetings are kept.`}
        confirmLabel="Delete project"
        onConfirm={remove}
        onClose={() => setDialog(null)}
      />
    </>
  )
}
