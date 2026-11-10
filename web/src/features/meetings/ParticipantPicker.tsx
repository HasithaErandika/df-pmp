import { useState } from 'react'
import { X } from 'lucide-react'
import { PersonSearch } from '../../components/people/PersonSearch'
import { Avatar } from '../../components/ui/Badges'
import { useUsers } from '../../hooks/useReferenceData'

type Props = {
  value: number[]
  onChange: (ids: number[]) => void
  error?: string
  disabled?: boolean
}

/** Participant chips plus organization search. Scales to large directories (no full user list). */
export function ParticipantPicker({ value, onChange, error, disabled }: Props) {
  const users = useUsers()
  const [names, setNames] = useState<Record<number, string>>({})
  const nameOf = (id: number) =>
    users.data?.find((u) => u.id === id)?.displayName ?? names[id] ?? `User ${id}`

  return (
    <fieldset className={`field span-2 participant-picker ${error ? 'field-invalid' : ''}`}>
      <legend>
        Participants <span className="count-pill">{value.length}</span>
      </legend>
      {!disabled && (
        <PersonSearch
          label="Add participants"
          placeholder="Add people by name or email"
          excludeIds={value}
          onSelect={(user) => {
            setNames((current) => ({ ...current, [user.id]: user.displayName }))
            onChange([...value, user.id])
          }}
        />
      )}
      <ul className="participant-chips">
        {value.map((id) => (
          <li key={id}>
            <Avatar name={nameOf(id)} size="sm" />
            <span>{nameOf(id)}</span>
            {!disabled && (
              <button
                type="button"
                aria-label={`Remove ${nameOf(id)}`}
                onClick={() => onChange(value.filter((v) => v !== id))}
              >
                <X size={13} />
              </button>
            )}
          </li>
        ))}
        {value.length === 0 && <li className="muted">No participants yet.</li>}
      </ul>
      {error && <span className="field-error">{error}</span>}
    </fieldset>
  )
}
