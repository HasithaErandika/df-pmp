import type { ComponentType, ReactNode } from 'react'
import { AlertTriangle, Inbox } from 'lucide-react'
import { Button } from './Button'

type EmptyStateProps = {
  title: string
  message?: string
  icon?: ComponentType<{ size?: number }>
  action?: ReactNode
}

/** Friendly placeholder when a list has no content, with an optional next step. */
export function EmptyState({ title, message, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={20} />
      </span>
      <b>{title}</b>
      {message && <p>{message}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <AlertTriangle size={18} aria-hidden="true" />
      <span>{error.message}</span>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}

/** Placeholder rows that reserve layout while data loads. */
export function Skeleton({ rows = 3, height = 44 }: { rows?: number; height?: number }) {
  return (
    <div className="skeleton-list" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className="skeleton" style={{ height }} />
      ))}
    </div>
  )
}

type QueryViewProps<T> = {
  query: { data: T | undefined; error: Error | null; loading: boolean; reload: () => void }
  skeleton?: ReactNode
  children: (data: T) => ReactNode
}

/** Renders loading, error or data states for a `useQuery` result consistently across views. */
export function QueryView<T>({ query, skeleton = <Skeleton />, children }: QueryViewProps<T>) {
  if (query.error && query.data === undefined)
    return <ErrorState error={query.error} onRetry={query.reload} />
  if (query.data === undefined) return skeleton
  return children(query.data)
}
