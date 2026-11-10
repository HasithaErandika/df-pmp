import { createContext, use, useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
type Toast = { id: number; kind: ToastKind; message: string }
type Notify = (message: string, kind?: ToastKind) => void

const ToastContext = createContext<Notify | null>(null)
const icons = { success: CheckCircle2, error: AlertCircle, info: Info }

/** Provides `notify()` for short, non-blocking feedback announced to assistive technology. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback<Notify>(
    (message, kind = 'success') => {
      const id = ++nextId.current
      setToasts((current) => [...current.slice(-2), { id, kind, message }])
      window.setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500)
    },
    [dismiss],
  )

  const value = useMemo(() => notify, [notify])

  return (
    <ToastContext value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map(({ id, kind, message }) => {
          const Icon = icons[kind]
          return (
            <div key={id} className={`toast toast-${kind}`}>
              <Icon size={16} aria-hidden="true" />
              <span>{message}</span>
              <button type="button" aria-label="Dismiss" onClick={() => dismiss(id)}>
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext>
  )
}

export function useToast() {
  const notify = use(ToastContext)
  if (!notify) throw new Error('useToast must be used within ToastProvider')
  return notify
}
