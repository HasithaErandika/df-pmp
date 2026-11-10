import { useState } from 'react'
import { matches } from '../../components/ui/Filters'
import { Avatar } from '../../components/ui/Badges'
import { useUsers } from '../../hooks/useReferenceData'

type Props = { value: number[]; onChange: (ids: number[]) => void; error?: string }

/** Searchable checklist for choosing meeting participants. */
export function ParticipantPicker({ value, onChange, error }: Props) {
  const users = useUsers()
  const [filter, setFilter] = useState('')
  const selected = new Set(value)
  const toggle = (id: number) =>
    onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id])
  const visible = (users.data ?? []).filter((user) => matches(filter, user.displayName, user.email))

  return (
    <fieldset className={`field span-2 participant-picker ${error ? 'field-invalid' : ''}`}>
      <legend>
        Participants <span className="count-pill">{value.length}</span>
      </legend>
      <input
        type="search"
        placeholder="Find people"
        aria-label="Find participants"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />
      <div className="participant-list">
        {visible.map((user) => (
          <label key={user.id} className={selected.has(user.id) ? 'checked' : ''}>
            <input
              type="checkbox"
              checked={selected.has(user.id)}
              onChange={() => toggle(user.id)}
            />
            <Avatar name={user.displayName} size="sm" />
            <span>{user.displayName}</span>
          </label>
        ))}
        {users.data && visible.length === 0 && (
          <span className="muted">No people match “{filter}”.</span>
        )}
      </div>
      {error && <span className="field-error">{error}</span>}
    </fieldset>
  )
}
