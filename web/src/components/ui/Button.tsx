import type { ButtonHTMLAttributes, ComponentType, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type IconType = ComponentType<{ size?: number; 'aria-hidden'?: boolean }>
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
  icon?: IconType
  loading?: boolean
  children: ReactNode
}

/** Primary action control. Shows a spinner and blocks repeat clicks while `loading`. */
export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled,
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`button button-${variant} button-${size} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <Loader2 size={16} className="spin" aria-hidden />
      ) : (
        Icon && <Icon size={16} aria-hidden />
      )}
      <span className="button-label">{children}</span>
    </button>
  )
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconType
  label: string
  size?: number
}

/** Icon-only button; `label` is required so the control has an accessible name. */
export function IconButton({
  icon: Icon,
  label,
  size = 18,
  className = '',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon size={size} aria-hidden />
    </button>
  )
}
