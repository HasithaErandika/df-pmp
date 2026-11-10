import { Link } from 'react-router-dom'
import { ArrowRight, FolderKanban } from 'lucide-react'
import { ProgressBar, StatusPill } from '../../components/ui/Badges'
import { formatDate } from '../../lib/dates'
import type { Project } from '../../types'

/** Summary card for a project; the whole card links to the project detail page. */
export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="panel project-card">
      <div className="project-card-top">
        <span className={`project-icon tone-${project.tone}`} aria-hidden="true">
          <FolderKanban size={18} />
        </span>
        <StatusPill status={project.status} />
      </div>
      <div className="mono-label">{project.id}</div>
      <h2>
        <Link to={`/projects/${project.id}`} className="stretched-link">
          {project.name}
        </Link>
      </h2>
      <p className="project-owner">Owner · {project.ownerName}</p>
      <div className="project-card-progress">
        <div>
          <span>Delivery progress</span>
          <b>{project.progress}%</b>
        </div>
        <ProgressBar
          value={project.progress}
          tone={project.tone}
          label={`${project.name} progress`}
        />
      </div>
      <div className="project-dates">
        <span>
          <small>START</small>
          {formatDate(project.startDate, { year: 'numeric' })}
        </span>
        <ArrowRight size={14} aria-hidden />
        <span>
          <small>PLANNED FINISH</small>
          {formatDate(project.endDate, { year: 'numeric' })}
        </span>
        <span className="open-items">
          <small>OPEN ITEMS</small>
          {project.openItems}
        </span>
      </div>
    </article>
  )
}
