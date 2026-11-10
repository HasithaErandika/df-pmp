import type { ReactNode } from 'react'

type PageHeadingProps = { kicker: string; title: string; description?: string; actions?: ReactNode }

/** Page title block with an eyebrow label and optional actions aligned to the right. */
export function PageHeading({ kicker, title, description, actions }: PageHeadingProps) {
  return (
    <section className="page-heading">
      <div>
        <div className="eyebrow">
          <span aria-hidden="true" />
          {kicker}
        </div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </section>
  )
}
