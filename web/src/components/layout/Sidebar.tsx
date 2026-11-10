import { Link, NavLink } from 'react-router-dom'
import {
  CalendarDays,
  ClipboardList,
  FolderKanban,
  Gauge,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Users,
  X,
} from 'lucide-react'
import { useConfig } from '../../context/ConfigContext'
import { useSession } from '../../context/SessionContext'
import { useProjects } from '../../hooks/useReferenceData'
import { Avatar } from '../ui/Badges'
import { IconButton } from '../ui/Button'

export const navigation = [
  { label: 'Overview', icon: Gauge, to: '/' },
  { label: 'My work', icon: ClipboardList, to: '/my-work' },
  { label: 'Projects', icon: FolderKanban, to: '/projects' },
  { label: 'Calendar', icon: CalendarDays, to: '/calendar' },
  { label: 'Meetings', icon: Users, to: '/meetings' },
]

type SidebarProps = {
  open: boolean
  collapsed: boolean
  onToggleCollapsed: () => void
  onClose: () => void
  onCreateProject: () => void
}

export function Sidebar({
  open,
  collapsed,
  onToggleCollapsed,
  onClose,
  onCreateProject,
}: SidebarProps) {
  const config = useConfig()
  const { session, can, signOut } = useSession()
  const projects = useProjects()
  const navClass = ({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? 'active' : ''}`

  return (
    <aside
      className={`sidebar ${open ? 'sidebar-open' : ''} ${collapsed ? 'collapsed' : ''}`}
      aria-label="Sidebar"
    >
      <div className="sidebar-header">
        <Link
          to="/"
          className="brand"
          aria-label={`${config.applicationName} home`}
          onClick={onClose}
        >
          <img className="brand-mark" src={config.logoPath} alt="" width={28} height={28} />
          <span className="brand-copy">
            <strong>{config.applicationName.toUpperCase()}</strong>
            <span>{config.companyName}</span>
          </span>
        </Link>
        <IconButton
          icon={PanelLeftClose}
          label="Collapse sidebar"
          size={16}
          className="collapse-toggle"
          onClick={onToggleCollapsed}
        />
        <IconButton icon={X} label="Close navigation" className="close-menu" onClick={onClose} />
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {collapsed && (
          <IconButton
            icon={PanelLeftOpen}
            label="Expand sidebar"
            size={16}
            className="expand-toggle"
            onClick={onToggleCollapsed}
          />
        )}
        <div className="side-label">Workspace</div>
        {navigation.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={navClass}
            title={collapsed ? label : undefined}
          >
            <Icon size={16} strokeWidth={1.75} aria-hidden />
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}

        <div className="side-label project-label">
          <span>Projects</span>
          {can('project:create') && (
            <IconButton
              icon={Plus}
              label="Create project"
              size={14}
              className="tiny"
              onClick={onCreateProject}
            />
          )}
        </div>
        {(projects.data ?? []).map((project) => (
          <NavLink
            key={project.id}
            to={`/projects/${project.id}`}
            onClick={onClose}
            className={navClass}
            title={collapsed ? project.name : undefined}
          >
            <span className={`project-dot fill-${project.tone}`} aria-hidden="true" />
            <span className="nav-label">{project.name}</span>
          </NavLink>
        ))}
      </nav>

      {session && (
        <div className="profile-row">
          <Avatar name={session.displayName} />
          <div className="profile-copy">
            <b>{session.displayName}</b>
            <small>
              {session.roles.map((role) => role.replace('_', ' ')).join(', ') || 'No role assigned'}
            </small>
          </div>
          <IconButton icon={LogOut} label="Sign out" size={16} onClick={signOut} />
        </div>
      )}
    </aside>
  )
}
