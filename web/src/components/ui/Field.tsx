import { useId } from 'react'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

type FieldShellProps = {
  label: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  children: (props: {
    id: string
    'aria-invalid': boolean
    'aria-describedby'?: string
  }) => ReactNode
}

/** Label, hint and error wiring shared by every form control. */
export function Field({ label, error, hint, required, className = '', children }: FieldShellProps) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ')
  return (
    <div className={`field ${error ? 'field-invalid' : ''} ${className}`}>
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy || undefined,
      })}
      {hint && !error && (
        <span id={`${id}-hint`} className="field-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      )}
    </div>
  )
}

type Common = { label: string; error?: string; hint?: string; className?: string }

export function TextField({
  label,
  error,
  hint,
  className,
  required,
  ...input
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(a11y) => <input {...input} {...a11y} required={required} />}
    </Field>
  )
}

export function TextAreaField({
  label,
  error,
  hint,
  className,
  required,
  ...input
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(a11y) => <textarea rows={3} {...input} {...a11y} required={required} />}
    </Field>
  )
}

type Option = { value: string | number; label: string }

export function SelectField({
  label,
  error,
  hint,
  className,
  required,
  options,
  placeholder,
  ...select
}: Common & SelectHTMLAttributes<HTMLSelectElement> & { options: Option[]; placeholder?: string }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(a11y) => (
        <select {...select} {...a11y} required={required}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}

/** Converts a string list into select options. */
export const toOptions = (values: string[]): Option[] =>
  values.map((value) => ({ value, label: value }))
