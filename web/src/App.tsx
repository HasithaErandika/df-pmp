import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, ArrowDown, ArrowRight, ArrowUp, Bell, CalendarDays, Check, ChevronDown,
  ChevronLeft, ChevronRight, CircleHelp, ClipboardList, Clock3, FolderKanban, Gauge,
  ListFilter, LogOut, Menu, MoreHorizontal, Plus, Search, Settings2, SlidersHorizontal, X,
} from 'lucide-react'

type AppConfig = {
  applicationName: string
  companyName: string
  productDescription: string
  logoPath: string
  timezone: string
  theme: Record<string, string>
  statusTones: Record<string, string>
}
type Project = { id: string; name: string; owner: string; status: string; progress: number; startDate: string; endDate: string; tone: string }
type WorkItem = { id: string; subject: string; project: string; type: string; status: string; priority: string; priorityDirection: string; assignee: string; dueDate: string }
type CalendarEvent = { id: string; title: string; type: string; tone: string; startsAt: string; endsAt: string; location: string; participants: number; project: string }
type DashboardData = { greetingName: string; summary: { label: string; value: string; detail: string; trend: string; tone: string }[]; projects: Project[]; workItems: WorkItem[] }

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

async function fetchJSON<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.json() as Promise<T>
}

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [preview, setPreview] = useState(() => sessionStorage.getItem('df-pmp-preview') === 'true')
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      fetchJSON<AppConfig>('/api/v1/config', controller.signal),
      fetchJSON<DashboardData>('/api/v1/dashboard', controller.signal),
    ]).then(([appConfig, appDashboard]) => {
      setConfig(appConfig)
      setDashboard(appDashboard)
      setLoadError('')
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setLoadError(error instanceof Error ? error.message : 'Unable to load application data')
    })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!config) return
    document.title = `${config.applicationName} | ${config.companyName}`
    const aliases: Record<string, string> = { primary: 'blue', primaryStrong: 'blue-strong', accent: 'red' }
    Object.entries(config.theme).forEach(([key, value]) => {
      const token = aliases[key] || key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
      document.documentElement.style.setProperty(`--axiata-${token}`, value)
      if (key === 'primary') document.documentElement.style.setProperty('--brand-blue', value)
      if (key === 'primaryStrong') document.documentElement.style.setProperty('--brand-blue-strong', value)
      if (key === 'accent') document.documentElement.style.setProperty('--brand-red', value)
      if (key === 'gold') document.documentElement.style.setProperty('--brand-gold', value)
      if (key === 'turquoise') document.documentElement.style.setProperty('--brand-turquoise', value)
    })
  }, [config])

  const announce = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2800)
  }
  const enterPreview = () => {
    sessionStorage.setItem('df-pmp-preview', 'true')
    setPreview(true)
    navigate('/')
  }
  const logout = () => {
    sessionStorage.removeItem('df-pmp-preview')
    setPreview(false)
    navigate('/login')
  }

  if (location.pathname === '/login' || !preview) {
    return <LoginPage config={config} loading={!config && !loadError} error={loadError} onPreview={enterPreview} onNotice={announce} notice={notice} />
  }
  if (loadError || !config || !dashboard) {
    return <div className="app-loading"><img src="/df-pmp-symbol.svg" alt="" /><h1>df-pmp</h1><p>{loadError || 'Loading your workspace…'}</p><button className="button button-primary" onClick={() => window.location.reload()}>Retry</button></div>
  }

  return <AppShell config={config} dashboard={dashboard} mobileMenu={mobileMenu} setMobileMenu={setMobileMenu} onLogout={logout} announce={announce} notice={notice} />
}

function LoginPage({ config, loading, error, onPreview, onNotice, notice }: { config: AppConfig | null; loading: boolean; error: string; onPreview: () => void; onNotice: (message: string) => void; notice: string }) {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const company = config?.companyName || 'Company workspace'
  const validate = () => {
    const normalized = email.trim()
    if (!normalized) return 'Enter your company email address.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) return 'Enter a valid email address.'
    return ''
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationMessage = validate()
    setEmailError(validationMessage)
    if (!validationMessage) onNotice('Company sign-in is not connected in this preview.')
  }

  return <div className="login-page">
    <aside className="login-brand-panel">
      <div className="login-brand"><img src={config?.logoPath || '/df-pmp-symbol.svg'} alt="" /><span><b>{config?.applicationName || 'df-pmp'}</b><small>{company}</small></span></div>
      <img className="login-illustration" src="/project-illustration.svg" alt="" />
      <div className="login-message"><div className="section-kicker">PROJECT DELIVERY, IN ONE PLACE</div><h1>Move important work forward.</h1><p>Projects, decisions, meetings and delivery progress — organized for the teams building what’s next.</p><div className="login-rule" /><div className="login-footnote">Secure company access<br />Designed for {company}</div></div>
      <div className="login-watermark" aria-hidden="true">df</div>
    </aside>
    <main className="login-main"><div className="login-form-wrap"><div className="mobile-login-brand"><img src={config?.logoPath || '/df-pmp-symbol.svg'} alt="" /><b>{config?.applicationName || 'df-pmp'}</b></div><div className="section-kicker">WELCOME BACK</div><h2>Sign in to {config?.applicationName || 'df-pmp'}</h2><p className="login-subtitle">Use your {company} company account to continue.</p>
      <form className="login-form" onSubmit={submit} noValidate>
        <label htmlFor="company-email">Company email</label><input id="company-email" type="email" autoComplete="username" value={email} onChange={(event) => { setEmail(event.target.value); if (emailError) setEmailError('') }} placeholder="name@company.com" aria-invalid={Boolean(emailError)} aria-describedby={emailError ? 'email-error' : undefined} />
        {emailError && <span className="field-error" id="email-error">{emailError}</span>}
        <button className="button button-primary login-submit" type="submit">Continue with company account<ArrowRight size={16} /></button>
      </form>
      <div className="login-divider"><span />or<span /></div>
      <button className="button button-secondary microsoft-button" onClick={() => onNotice('Microsoft Entra ID needs tenant configuration before sign-in can be enabled.')}><MicrosoftMark />Continue with Microsoft</button>
      <div className="preview-access"><div><b>Previewing the interface?</b><span>Open the workspace with sample data.</span></div><button className="preview-link" onClick={onPreview}>Open preview <ArrowRight size={14} /></button></div>
      {(notice || error) && <div className={error ? 'inline-alert alert-error' : 'inline-alert'} role="status">{error || notice}</div>}
      {loading && <div className="login-loading">Loading company settings…</div>}
      <footer className="login-legal">Access is managed by your organization. Contact your administrator if you need assistance.</footer>
    </div></main>
  </div>
}

function MicrosoftMark() { return <svg className="microsoft-mark" viewBox="0 0 20 20" aria-hidden="true"><path fill="#f25022" d="M1 1h8.5v8.5H1z"/><path fill="#7fba00" d="M10.5 1H19v8.5h-8.5z"/><path fill="#00a4ef" d="M1 10.5h8.5V19H1z"/><path fill="#ffb900" d="M10.5 10.5H19V19h-8.5z"/></svg> }

function AppShell({ config, dashboard, mobileMenu, setMobileMenu, onLogout, announce, notice }: { config: AppConfig; dashboard: DashboardData; mobileMenu: boolean; setMobileMenu: (value: boolean) => void; onLogout: () => void; announce: (message: string) => void; notice: string }) {
  const location = useLocation()
  const [search, setSearch] = useState('')
  const nav = [
    { label: 'Overview', icon: Gauge, to: '/' },
    { label: 'My work', icon: ClipboardList, to: '/my-work' },
    { label: 'Projects', icon: FolderKanban, to: '/projects' },
    { label: 'Calendar', icon: CalendarDays, to: '/calendar' },
  ]
  const page = nav.find((item) => item.to === location.pathname)?.label || (location.pathname === '/meetings' ? 'Meetings' : 'Workspace')
  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
      <div className="brand-row"><img className="brand-mark" src={config.logoPath} alt="" /><div className="brand-copy"><strong>{config.applicationName}</strong><span>{config.companyName}</span></div><button className="icon-button close-menu" aria-label="Close navigation" onClick={() => setMobileMenu(false)}><X size={18} /></button></div>
      <div className="workspace-card"><div className="workspace-initial">{config.companyName.slice(0, 1)}</div><div className="workspace-copy"><b>{config.companyName}</b><small>{config.productDescription}</small></div><ChevronDown size={15} /></div>
      <div className="side-label">WORKSPACE</div><nav className="primary-nav" aria-label="Main navigation">{nav.map(({ label, icon: Icon, to }) => <NavLink key={label} to={to} end={to === '/'} onClick={() => setMobileMenu(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span></NavLink>)}</nav>
      <div className="side-label project-label"><span>PROJECTS</span><button className="tiny-icon" aria-label="Create project" onClick={() => announce('Project creation will be available when project APIs are enabled.')}><Plus size={15} /></button></div>
      <div className="project-list">{dashboard.projects.map((project) => <NavLink key={project.id} to="/projects" className="project-nav"><span className={`project-dot dot-${project.tone}`} />{project.name}</NavLink>)}</div>
      <div className="sidebar-spacer" /><div className="sidebar-bottom"><button className="nav-item" onClick={() => announce('Help center is not configured yet.')}><CircleHelp size={18} /><span>Help center</span></button><button className="nav-item" onClick={() => announce('Application settings are planned for a later phase.')}><Settings2 size={18} /><span>Settings</span></button><div className="profile-row"><div className="avatar avatar-profile">{initials(dashboard.greetingName)}</div><div className="profile-copy"><b>{dashboard.greetingName}</b><small>Preview access</small></div><button className="icon-button profile-logout" onClick={onLogout} aria-label="Sign out"><LogOut size={16} /></button></div></div>
    </aside>
    {mobileMenu && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}
    <main className="main-area"><header className="topbar"><button className="icon-button mobile-trigger" aria-label="Open navigation" onClick={() => setMobileMenu(true)}><Menu size={20} /></button><div className="breadcrumbs"><span>{config.companyName}</span><ChevronRight size={14} /><strong>{page}</strong></div><div className="topbar-actions"><label className="global-search"><Search size={16} /><input aria-label="Search projects, work and meetings" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects and work" /><kbd>/</kbd></label><button className="icon-button notification-button" aria-label="Notifications" onClick={() => announce('You are all caught up.')}><Bell size={18} /></button><div className="avatar avatar-top">{initials(dashboard.greetingName)}</div></div></header>
      <Routes><Route path="/" element={<DashboardPage data={dashboard} search={search} statusTones={config.statusTones} timeZone={config.timezone} announce={announce} />} /><Route path="/my-work" element={<WorkPage items={dashboard.workItems} globalSearch={search} statusTones={config.statusTones} />} /><Route path="/projects" element={<ProjectsPage projects={dashboard.projects} search={search} statusTones={config.statusTones} />} /><Route path="/calendar" element={<CalendarPage search={search} timeZone={config.timezone} />} /><Route path="/meetings" element={<CalendarPage meetingOnly search={search} timeZone={config.timezone} />} /></Routes>
      <footer className="page-footer"><span>{config.applicationName}<i />{config.companyName}</span><span className="preview-status"><b />Preview data</span></footer>
    </main>{notice && <div className="toast" role="status"><Check size={16} />{notice}</div>}
  </div>
}

function DashboardPage({ data, search, statusTones, timeZone, announce }: { data: DashboardData; search: string; statusTones: Record<string, string>; timeZone: string; announce: (message: string) => void }) {
  const today = new Date()
  const todayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone }).format(today)
  const filteredProjects = data.projects.filter((project) => `${project.id} ${project.name} ${project.owner}`.toLowerCase().includes(search.toLowerCase()))
  const filteredWork = data.workItems.filter((item) => `${item.id} ${item.subject} ${item.project} ${item.assignee}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="page-content"><section className="welcome-row"><div><div className="eyebrow"><span />{todayLabel.toUpperCase()}</div><h1>Welcome back, {data.greetingName}</h1><p>A clear view of delivery, decisions and upcoming work.</p></div><button className="button button-primary" onClick={() => announce('Create work item will be enabled with the work item API.')}><Plus size={16} />New work item</button></section>
    <section className="metric-grid" aria-label="Portfolio summary">{data.summary.map((metric) => <article className="metric-card" key={metric.label}><div className="metric-top"><span>{metric.label}</span><span className={`metric-icon metric-${metric.tone}`}>{metric.tone === 'red' ? <ClipboardList size={17} /> : metric.tone === 'gold' ? <CalendarDays size={17} /> : metric.tone === 'green' ? <Check size={17} /> : <FolderKanban size={17} />}</span></div><div className="metric-value">{metric.value}{metric.trend && <span className={`metric-change ${metric.tone === 'green' ? 'change-positive' : ''}`}>{metric.trend}</span>}</div><div className="metric-foot">{metric.detail}</div></article>)}</section>
    <section className="panel timeline-panel"><div className="panel-heading"><div><div className="title-with-icon"><span className="heading-icon"><Activity size={17} /></span><h2>Project timeline</h2></div><p>Schedule and delivery progress across active projects.</p></div><button className="text-button" onClick={() => announce('Timeline view options will be configurable.')}><SlidersHorizontal size={15} />View options</button></div><ProjectTimeline projects={filteredProjects} /></section>
    <section className="panel work-panel"><div className="panel-heading"><div><div className="title-with-icon"><span className="heading-icon heading-red"><ClipboardList size={17} /></span><h2>Priority work</h2><span className="count-pill">{filteredWork.length}</span></div><p>Work items that need attention across your projects.</p></div></div><WorkTable items={filteredWork.slice(0, 5)} statusTones={statusTones} /></section>
  </div>
}

function ProjectTimeline({ projects }: { projects: Project[] }) {
  const rangeStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
  const rangeEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 4, 0)
  const totalDays = Math.max(1, (rangeEnd.getTime() - rangeStart.getTime()) / 86400000)
  const months = Array.from({ length: 5 }, (_, index) => new Date(rangeStart.getFullYear(), rangeStart.getMonth() + index, 1))
  const getOffset = (date: string) => Math.max(0, Math.min(100, ((new Date(date).getTime() - rangeStart.getTime()) / 86400000 / totalDays) * 100))
  const projectRows = projects.map((project) => {
    const left = getOffset(project.startDate)
    const right = getOffset(project.endDate)

    return (
      <div className="timeline-row" key={project.id}>
        <div className="timeline-project">
          <span className={`project-dot dot-${project.tone}`} />
          <span><b>{project.name}</b><small>{project.id}</small></span>
        </div>
        <div className="timeline-lane">
          <div className="timeline-month-lines">
            {months.map((month) => <i key={month.toISOString()} />)}
          </div>
          <div className={`timeline-bar bar-${project.tone}`} style={{ left: `${left}%`, width: `${Math.max(2, right - left)}%` }}>
            <span style={{ width: `${project.progress}%` }} />
          </div>
          <span className="timeline-milestone" style={{ left: `${Math.min(98, right)}%` }} title={project.endDate} />
        </div>
      </div>
    )
  })

  return (
    <div className="timeline-scroll">
      <div className="timeline-grid">
        <div className="timeline-label-head">PROJECT</div>
        <div className="timeline-axis">
          {months.map((month) => (
            <div className="timeline-month" key={month.toISOString()}>
              {new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(month)}
            </div>
          ))}
        </div>
        {projectRows}
        {projects.length === 0 && <div className="empty-state">No projects match your search.</div>}
      </div>
    </div>
  )
}

function WorkPage({ items, globalSearch, statusTones }: { items: WorkItem[]; globalSearch: string; statusTones: Record<string, string> }) {
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const visible = items.filter((item) => {
    const text = `${item.id} ${item.subject} ${item.project} ${item.assignee}`.toLowerCase()
    return (filter === 'All' || item.status === filter) && text.includes(search.toLowerCase()) && text.includes(globalSearch.toLowerCase())
  })
  const statuses = [...new Set(items.map((item) => item.status))]
  return <div className="page-content"><PageHeading kicker="PERSONAL WORKSPACE" title="My work" description="Track your assigned tasks, actions and upcoming deadlines." /><div className="panel work-panel"><div className="work-toolbar"><div className="filter-tabs">{['All', ...statuses].map((value) => <button key={value} className={`filter-tab ${filter === value ? 'selected' : ''}`} onClick={() => setFilter(value)}>{value}</button>)}</div><label className="table-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter work items" /></label><button className="utility-button"><ListFilter size={15} />Filter</button></div><WorkTable items={visible} statusTones={statusTones} /></div></div>
}

function ProjectsPage({ projects, search, statusTones }: { projects: Project[]; search: string; statusTones: Record<string, string> }) {
  const visibleProjects = projects.filter((project) => `${project.id} ${project.name} ${project.owner} ${project.status}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="page-content"><PageHeading kicker="PORTFOLIO" title="Projects" description="A portfolio view of projects currently in delivery and planning." action={<button className="button button-primary" disabled><Plus size={16} />New project</button>} /><div className="project-card-grid">{visibleProjects.map((project) => <article className="panel project-card" key={project.id}><div className="project-card-top"><span className={`project-icon tone-${project.tone}`}><FolderKanban size={18} /></span><button className="icon-button compact" aria-label={`More options for ${project.name}`}><MoreHorizontal size={18} /></button></div><div className="project-code">{project.id}</div><h2>{project.name}</h2><div className="project-card-meta"><span className={`status-pill status-tone-${statusTones[project.status] || 'neutral'}`}><i />{project.status}</span><span>Owner · {project.owner}</span></div><div className="project-card-progress"><div><span>Delivery progress</span><b>{project.progress}%</b></div><div className="progress-track"><span className={`progress-fill fill-${project.tone}`} style={{ width: `${project.progress}%` }} /></div></div><div className="project-dates"><span><small>START</small>{dateFormat.format(new Date(project.startDate))}</span><ArrowRight size={14} /><span><small>PLANNED FINISH</small>{dateFormat.format(new Date(project.endDate))}</span></div></article>)}</div>{visibleProjects.length === 0 && <div className="empty-state">No projects match your search.</div>}</div>
}

function CalendarPage({ meetingOnly = false, search, timeZone }: { meetingOnly?: boolean; search: string; timeZone: string }) {
  const [month, setMonth] = useState(() => new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('All types')
  const [retry, setRetry] = useState(0)
  const monthStart = useMemo(() => new Date(month.getFullYear(), month.getMonth(), 1), [month])
  const monthEnd = useMemo(() => new Date(month.getFullYear(), month.getMonth() + 1, 0), [month])
  const from = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-01`
  const to = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`
  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    fetchJSON<CalendarEvent[]>(`/api/v1/calendar?from=${from}&to=${to}`, controller.signal).then((data) => { setEvents(data); setStatus('ready'); setError('') }).catch((reason: unknown) => { if (reason instanceof DOMException && reason.name === 'AbortError') return; setStatus('error'); setError(reason instanceof Error ? reason.message : 'Calendar data could not be loaded') })
    return () => controller.abort()
  }, [from, to, retry])
  const meetingTypes = [...new Set(events.map((event) => event.type))]
  const filteredEvents = events.filter((event) => (filter === 'All types' || event.type === filter) && `${event.title} ${event.type} ${event.project} ${event.location}`.toLowerCase().includes(search.toLowerCase()))
  const firstDayOffset = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = [...Array.from({ length: firstDayOffset }, () => null), ...Array.from({ length: dayCount }, (_, index) => index + 1)]
  const monthName = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month)
  const eventsForDay = (day: number) => filteredEvents.filter((event) => Number(event.startsAt.slice(8, 10)) === day)
  return <div className="page-content"><PageHeading kicker={meetingOnly ? 'MEETING MANAGEMENT' : 'SCHEDULE'} title={meetingOnly ? 'Meetings' : 'Calendar'} description={meetingOnly ? 'Meeting sessions and follow-up across your workspace.' : 'Project milestones, meetings and delivery dates in one view.'} action={<button className="button button-primary" disabled><Plus size={16} />Schedule meeting</button>} />
    <div className="calendar-layout"><section className="panel calendar-panel"><div className="calendar-toolbar"><div className="calendar-month"><button className="icon-button compact" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={18} /></button><h2>{monthName}</h2><button className="icon-button compact" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={18} /></button><button className="button button-secondary today-button" onClick={() => setMonth(new Date())}>Today</button></div><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter calendar by meeting type"><option>All types</option>{meetingTypes.map((type) => <option key={type}>{type}</option>)}</select></div>
      {status === 'error' && <div className="calendar-error" role="alert"><span>{error}</span><button className="text-button" onClick={() => setRetry((value) => value + 1)}>Retry</button></div>}
      <div className="calendar-grid"><div className="calendar-weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-days">{cells.map((day, index) => day === null ? <div className="calendar-day empty-day" key={`empty-${index}`} /> : <div className={`calendar-day ${day === new Date().getDate() && month.getMonth() === new Date().getMonth() && month.getFullYear() === new Date().getFullYear() ? 'today' : ''}`} key={day}><span className="day-number">{day}</span><div className="day-events">{eventsForDay(day).map((event) => <div title={event.title} className={`calendar-event event-${event.tone}`} key={event.id}>{event.title}</div>)}</div></div>)}</div></div>
      {status === 'loading' && <div className="calendar-state">Loading calendar events…</div>}{status === 'ready' && events.length === 0 && <div className="calendar-state">No events are scheduled for this month.</div>}
    </section><aside className="panel agenda-panel"><div className="agenda-heading"><div className="section-kicker">MONTH AGENDA</div><h2>{monthName}</h2><p>{filteredEvents.length} scheduled {filteredEvents.length === 1 ? 'event' : 'events'}</p></div><div className="agenda-list">{filteredEvents.slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map((event) => <article className="agenda-item" key={event.id}><div className={`agenda-date agenda-${event.tone}`}><b>{new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(new Date(event.startsAt))}</b><span>{new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(event.startsAt)).toUpperCase()}</span></div><div className="agenda-info"><b>{event.title}</b><span><Clock3 size={13} />{new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(event.startsAt))}</span><small>{event.location} · {event.participants} participants</small><small>{event.project}</small></div></article>)}{status === 'ready' && filteredEvents.length === 0 && <div className="agenda-empty">No meetings match this month and filter.</div>}</div></aside></div>
  </div>
}

function PageHeading({ kicker, title, description, action }: { kicker: string; title: string; description: string; action?: ReactNode }) { return <section className="welcome-row page-heading"><div><div className="eyebrow"><span />{kicker}</div><h1>{title}</h1><p>{description}</p></div>{action}</section> }

function WorkTable({ items, statusTones }: { items: WorkItem[]; statusTones: Record<string, string> }) {
  return <div className="table-wrap"><table><thead><tr><th>WORK ITEM</th><th>PROJECT</th><th>STATUS</th><th>PRIORITY</th><th>ASSIGNEE</th><th>DUE DATE</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><div className="work-title"><span className="type-mark"><ClipboardList size={13} /></span><div><b>{item.subject}</b><small>{item.id}<span>·</span>{item.type}</small></div></div></td><td>{item.project}</td><td><span className={`status-pill status-tone-${statusTones[item.status] || 'neutral'}`}><i />{item.status}</span></td><td><span className={`priority priority-${item.priorityDirection}`}>{item.priorityDirection === 'up' ? <ArrowUp size={13} /> : item.priorityDirection === 'down' ? <ArrowDown size={13} /> : <span>—</span>}{item.priority}</span></td><td>{item.assignee}</td><td>{dateFormat.format(new Date(`${item.dueDate}T12:00:00`))}</td></tr>)}</tbody></table>{items.length === 0 && <div className="empty-state">No work items found.</div>}</div>
}

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') }

export default App
