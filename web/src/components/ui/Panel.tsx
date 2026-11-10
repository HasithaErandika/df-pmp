import type { ComponentType, ReactNode } from 'react'
import type { Tone } from '../../types'

type PanelProps = {
  title?: string
  description?: string
  icon?: ComponentType<{ size?: number }>
  tone?: Tone
  count?: number
  actions?: ReactNode
  className?: string
  children: ReactNode
}

/** Card container with an optional titled header. */
export function Panel({
  title,
  description,
  icon: Icon,
  tone = 'blue',
  count,
  actions,
  className = '',
  children,
}: PanelProps) {
  return (
    <section className={`panel ${className}`} aria-label={title}>
      {title && (
        <header className="panel-heading">
          <div>
            <div className="title-with-icon">
              {Icon && (
                <span className={`heading-icon tone-${tone}`}>
                  <Icon size={17} />
                </span>
              )}
              <h2>{title}</h2>
              {count !== undefined && <span className="count-pill">{count}</span>}
            </div>
            {description && <p className={Icon ? 'indented' : ''}>{description}</p>}
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
