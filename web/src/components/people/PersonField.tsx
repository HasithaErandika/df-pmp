import { useState } from 'react'
import { X } from 'lucide-react'
import { useUsers } from '../../hooks/useReferenceData'
import { Avatar } from '../ui/Badges'
import { Field } from '../ui/Field'
import { PersonSearch } from './PersonSearch'

type Props = {
  label: string
  value: number | null
  onChange: (id: number | null) => void
  error?: string
  required?: boolean
  clearable?: boolean
  disabled?: boolean
}

/** Single-person form field (owner, assignee) with organization search. */
export function PersonField({
  label,
  value,
  onChange,
  error,
  required,
  clearable,
  disabled,
}: Props) {
  const users = useUsers()
  const [names, setNames] = useState<Record<number, string>>({})
  const [editing, setEditing] = useState(false)
  const selected = value
    ? (users.data?.find((u) => u.id === value)?.displayName ?? names[value])
    : undefined

  return (
    <Field label={label} error={error} required={required}>
      {(a11y) =>
        selected && !editing ? (
          <div className="person-chip-field">
            <Avatar name={selected} size="sm" />
            <span className="truncate">{selected}</span>
            {!disabled && (
              <button
                type="button"
                className="link-button"
                onClick={() => setEditing(true)}
                id={a11y.id}
              >
                Change
              </button>
            )}
            {clearable && !disabled && (
              <button
                type="button"
                className="icon-button tiny"
                aria-label={`Clear ${label}`}
                onClick={() => onChange(null)}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <PersonSearch
            label={label}
            inputProps={a11y}
            autoFocus={editing}
            onSelect={(user) => {
              setNames((current) => ({ ...current, [user.id]: user.displayName }))
              onChange(user.id)
              setEditing(false)
            }}
          />
        )
      }
    </Field>
  )
}
