import { useEffect, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { ChevronRight, Menu, Search } from 'lucide-react'
import { useConfig } from '../../context/ConfigContext'
import { useSession } from '../../context/SessionContext'
import { Avatar } from '../ui/Badges'
import { IconButton } from '../ui/Button'
import { navigation } from './Sidebar'

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

/** Page header with breadcrumbs and a URL-backed search box (`?q=`) shared by all list views. */
export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const config = useConfig()
  const { session } = useSession()
  const { pathname } = useLocation()
  const [params, setParams] = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const page =
    navigation.find((item) => item.to === pathname)?.label ??
    (pathname.startsWith('/projects/') ? 'Project details' : 'Workspace')

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '/' && !isTypingTarget(event.target)) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const setQuery = (value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set('q', value)
    else next.delete('q')
    setParams(next, { replace: true })
  }

  return (
    <header className="topbar">
      <IconButton
        icon={Menu}
        label="Open navigation"
        className="mobile-trigger"
        onClick={onOpenMenu}
      />
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span>{config.companyName}</span>
        <ChevronRight size={14} aria-hidden />
        <strong aria-current="page">{page}</strong>
      </nav>
      <div className="topbar-actions">
        <label className="global-search">
          <Search size={16} aria-hidden />
          <input
            ref={inputRef}
            type="search"
            aria-label="Search this page"
            value={params.get('q') ?? ''}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === 'Escape' && setQuery('')}
            placeholder="Search this page"
          />
          <kbd aria-hidden="true">/</kbd>
        </label>
        {session && <Avatar name={session.displayName} />}
      </div>
    </header>
  )
}
