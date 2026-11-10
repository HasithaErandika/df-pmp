import { useEffect, useId, useState } from 'react'
import { Building2, Loader2, Search } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { invalidate } from '../../hooks/useQuery'
import { api } from '../../lib/api'
import type { Person, User } from '../../types'
import { Avatar } from '../ui/Badges'

type Props = {
  onSelect: (user: User) => void
  excludeIds?: number[]
  placeholder?: string
  label: string
  inputProps?: { id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }
  initialText?: string
  autoFocus?: boolean
}

/**
 * Accessible combobox that finds people in df-pmp and, when signed in with Microsoft, in the
 * organization's Entra ID directory. Choosing an organization person adds them to df-pmp first.
 */
export function PersonSearch({
  onSelect,
  excludeIds = [],
  placeholder,
  label,
  inputProps,
  initialText = '',
  autoFocus,
}: Props) {
  const listId = useId()
  const notify = useToast()
  const [text, setText] = useState(initialText)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [results, setResults] = useState<{ directory: boolean; people: Person[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const query = text.trim()
  const people = (results?.people ?? []).filter(
    (p) => !p.localId || !excludeIds.includes(p.localId),
  )

  useEffect(() => {
    if (query.length < 2) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setBusy(true)
      api
        .people(query, controller.signal)
        .then((r) => {
          setResults(r)
          setActive(0)
        })
        .catch(() => undefined)
        .finally(() => setBusy(false))
    }, 250)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const choose = async (person: Person) => {
    try {
      let id = person.localId
      if (!id) {
        const added = await api.addPerson(person.entraId)
        id = added.localId
        invalidate('users')
        notify(`${person.displayName} added from your organization.`)
      }
      if (id) onSelect({ id, displayName: person.displayName, email: person.email })
      setText('')
      setOpen(false)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to add this person.', 'error')
    }
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActive((i) =>
        people.length
          ? (i + (event.key === 'ArrowDown' ? 1 : -1) + people.length) % people.length
          : 0,
      )
    } else if (event.key === 'Enter' && open && people[active]) {
      event.preventDefault()
      void choose(people[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && query.length >= 2
  return (
    <div className="person-search">
      <span className="person-search-input">
        {busy ? (
          <Loader2 size={15} className="spin" aria-hidden />
        ) : (
          <Search size={15} aria-hidden />
        )}
        <input
          {...inputProps}
          type="text"
          role="combobox"
          aria-label={inputProps?.id ? undefined : label}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && people[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={placeholder ?? 'Search by name or email'}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
        />
      </span>
      {showList && (
        <ul id={listId} role="listbox" className="person-options">
          {people.map((person, index) => (
            <li
              key={person.localId ?? person.entraId}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              className={index === active ? 'active' : ''}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => void choose(person)}
            >
              <Avatar name={person.displayName} size="sm" />
              <span className="person-option-text">
                <b>{person.displayName}</b>
                <small>{person.email}</small>
              </span>
              {person.source === 'entra' && (
                <span className="org-badge">
                  <Building2 size={12} aria-hidden /> Organization
                </span>
              )}
            </li>
          ))}
          {!busy && results && people.length === 0 && (
            <li className="person-empty">No people match “{query}”.</li>
          )}
          <li className="person-hint" aria-hidden="true">
            {results?.directory
              ? 'Includes your Microsoft Entra directory'
              : 'Searching df-pmp users'}
          </li>
        </ul>
      )}
    </div>
  )
}
