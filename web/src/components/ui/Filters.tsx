import { Search } from 'lucide-react'

type FilterTabsProps = {
  label: string
  options: { value: string; label: string; count?: number }[]
  value: string
  onChange: (value: string) => void
}

/** Segmented filter rendered as a radio group so it is operable by keyboard and screen readers. */
export function FilterTabs({ label, options, value, onChange }: FilterTabsProps) {
  return (
    <div className="filter-tabs" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={`filter-tab ${value === option.value ? 'selected' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count !== undefined && <span className="filter-count">{option.count}</span>}
        </button>
      ))}
    </div>
  )
}

type SearchInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchInput({ label, value, onChange, placeholder }: SearchInputProps) {
  return (
    <label className="table-search">
      <Search size={15} aria-hidden="true" />
      <input
        type="search"
        aria-label={label}
        value={value}
        placeholder={placeholder ?? label}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

/** Case-insensitive match of a query against several fields. */
export const matches = (query: string, ...fields: (string | number | null | undefined)[]) => {
  const needle = query.trim().toLowerCase()
  return (
    !needle ||
    fields.some((field) =>
      String(field ?? '')
        .toLowerCase()
        .includes(needle),
    )
  )
}
