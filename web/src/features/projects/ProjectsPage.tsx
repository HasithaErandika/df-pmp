import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FolderKanban, Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { FilterTabs, matches } from '../../components/ui/Filters'
import { PageHeading } from '../../components/ui/PageHeading'
import { EmptyState, QueryView, Skeleton } from '../../components/ui/States'
import { useConfig } from '../../context/ConfigContext'
import { useSession } from '../../context/SessionContext'
import { useProjects } from '../../hooks/useReferenceData'
import { ProjectCard } from './ProjectCard'
import { ProjectFormDialog } from './ProjectFormDialog'

export default function ProjectsPage() {
  const { workflow } = useConfig()
  const { can } = useSession()
  const projects = useProjects()
  const [params] = useSearchParams()
  const search = params.get('q') ?? ''
  const [status, setStatus] = useState('All')
  const [creating, setCreating] = useState(false)

  return (
    <>
      <PageHeading
        kicker="PORTFOLIO"
        title="Projects"
        description="Every project in delivery and planning, with ownership and progress."
        actions={
          can('project:create') && (
            <Button icon={Plus} onClick={() => setCreating(true)}>
              New project
            </Button>
          )
        }
      />
      <QueryView query={projects} skeleton={<Skeleton rows={3} height={200} />}>
        {(items) => {
          const visible = items.filter(
            (p) =>
              (status === 'All' || p.status === status) &&
              matches(search, p.id, p.name, p.ownerName),
          )
          const options = ['All', ...workflow.projectStatuses].map((value) => ({
            value,
            label: value,
            count: value === 'All' ? items.length : items.filter((p) => p.status === value).length,
          }))
          return (
            <>
              <div className="toolbar-row">
                <FilterTabs
                  label="Filter by status"
                  options={options}
                  value={status}
                  onChange={setStatus}
                />
              </div>
              {visible.length === 0 ? (
                <EmptyState
                  icon={FolderKanban}
                  title={items.length === 0 ? 'No projects yet' : 'No projects match'}
                  message={
                    items.length === 0
                      ? 'Create the first project to start tracking delivery.'
                      : 'Try a different status or search term.'
                  }
                />
              ) : (
                <div className="project-card-grid">
                  {visible.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </>
          )
        }}
      </QueryView>
      <ProjectFormDialog open={creating} onClose={() => setCreating(false)} />
    </>
  )
}
