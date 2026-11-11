import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './Button'

type ModalProps = {
  title: string
  description?: string
  open: boolean
  onClose: () => void
  size?: 'md' | 'lg' | 'xl'
  footer?: ReactNode
  children: ReactNode
}

/**
 * Accessible dialog built on the native <dialog> element, which provides focus trapping,
 * Escape-to-close and an inert background.
 */
export function Modal({
  title,
  description,
  open,
  onClose,
  size = 'md',
  footer,
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`modal modal-${size}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className="modal-body">
          <header className="modal-header">
            <div>
              <h2 id={titleId}>{title}</h2>
              {description && <p>{description}</p>}
            </div>
            <IconButton icon={X} label="Close dialog" onClick={onClose} />
          </header>
          <div className="modal-content">{children}</div>
          {footer && <footer className="modal-footer">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
