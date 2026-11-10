import { Suspense, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useConfig } from '../../context/ConfigContext'
import { useSession } from '../../context/SessionContext'
import { useStoredState } from '../../hooks/useStoredState'
import { ProjectFormDialog } from '../../features/projects/ProjectFormDialog'
import { Skeleton } from '../ui/States'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

/** Authenticated layout: navigation, header, routed page content and footer. */
export function AppShell() {
  const config = useConfig()
  const { status } = useSession()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const [collapsed, setCollapsed] = useStoredState('df-pmp-sidebar-collapsed', false)

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Sidebar
        open={menuOpen}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed(!collapsed)}
        onClose={() => setMenuOpen(false)}
        onCreateProject={() => {
          setMenuOpen(false)
          setCreatingProject(true)
        }}
      />
      {menuOpen && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="main-area">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main id="main-content" className="page-content" tabIndex={-1}>
          <Suspense fallback={<Skeleton rows={4} height={90} />}>
            <Outlet key={pathname} />
          </Suspense>
        </main>
        <footer className="page-footer">
          <span>
            {config.applicationName}
            <i aria-hidden="true" />
            {config.companyName}
          </span>
          <span className="preview-status">
            <b aria-hidden="true" />
            {status?.mode === 'entra' ? 'Microsoft 365 sign-in' : 'Preview environment'}
          </span>
        </footer>
      </div>
      <ProjectFormDialog
        open={creatingProject}
        onClose={() => setCreatingProject(false)}
        onSaved={(project) => navigate(`/projects/${project.id}`)}
      />
    </div>
  )
}
