import { useId, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Field } from './Field'

type Props = {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  suggestions?: string[]
  placeholder?: string
  error?: string
  hint?: string
  disabled?: boolean
  className?: string
}

/** Free-text list field: Enter or comma adds an entry, Backspace on empty input removes the last. */
export function TagInput({
  label,
  value,
  onChange,
  suggestions = [],
  placeholder,
  error,
  hint,
  disabled,
  className,
}: Props) {
  const [draft, setDraft] = useState('')
  const listId = useId()

  const add = (raw: string) => {
    const entry = raw.trim()
    setDraft('')
    if (entry && !value.some((v) => v.toLowerCase() === entry.toLowerCase())) {
      onChange([...value, entry])
    }
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      add(draft)
    } else if (event.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(a11y) => (
        <div className={`tag-input ${disabled ? 'disabled' : ''}`}>
          {value.map((tag) => (
            <span key={tag} className="tag-chip">
              {tag}
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remove ${tag}`}
                  onClick={() => onChange(value.filter((v) => v !== tag))}
                >
                  <X size={12} aria-hidden />
                </button>
              )}
            </span>
          ))}
          <input
            {...a11y}
            list={listId}
            value={draft}
            disabled={disabled}
            placeholder={value.length ? '' : placeholder}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => add(draft)}
          />
          <datalist id={listId}>
            {suggestions
              .filter((s) => !value.includes(s))
              .map((s) => (
                <option key={s} value={s} />
              ))}
          </datalist>
        </div>
      )}
    </Field>
  )
}
