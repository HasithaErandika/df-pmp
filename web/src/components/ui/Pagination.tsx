import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

const pageSizes = [10, 20, 50, 100]

/** Page numbers to show: first, last and neighbours of the current page, with gaps as null. */
export function pageWindow(page: number, totalPages: number): (number | null)[] {
  const wanted = [1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages)
  const sorted = [...new Set(wanted)].sort((a, b) => a - b)
  const out: (number | null)[] = []
  sorted.forEach((p, i) => {
    const gap = i > 0 ? p - sorted[i - 1] : 1
    if (gap === 2) out.push(p - 1)
    else if (gap > 2) out.push(null)
    out.push(p)
  })
  return out
}

/** Client-side paging state. The page is clamped when the list shrinks (e.g. after filtering). */
export function usePagination<T>(items: T[], initialSize = 10) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialSize)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(page, totalPages)
  return {
    rows: items.slice((current - 1) * pageSize, current * pageSize),
    meta: { page: current, pageSize, total: items.length, totalPages },
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size)
      setPage(1)
    },
  }
}

type PaginationProps = {
  meta: { page: number; pageSize: number; total: number; totalPages: number }
  onPage: (page: number) => void
  onPageSize?: (size: number) => void
}

export function Pagination({ meta, onPage, onPageSize }: PaginationProps) {
  const { page, pageSize, total, totalPages } = meta
  if (total === 0) return null
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)
  const nav = (label: string, target: number, Icon: typeof ChevronLeft, disabled: boolean) => (
    <button
      type="button"
      className="page-button"
      aria-label={label}
      disabled={disabled}
      onClick={() => onPage(target)}
    >
      <Icon size={15} aria-hidden />
    </button>
  )

  return (
    <nav className="pagination" aria-label="Pagination">
      <div className="pagination-summary">
        <span className="tabular">
          {first}–{last} of {total}
        </span>
        {onPageSize && (
          <label>
            Rows
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => onPageSize(Number(e.target.value))}
            >
              {pageSizes.map((size) => (
                <option key={size}>{size}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="pagination-pages">
        {nav('First page', 1, ChevronsLeft, page === 1)}
        {nav('Previous page', page - 1, ChevronLeft, page === 1)}
        {pageWindow(page, totalPages).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="page-gap" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`page-button ${p === page ? 'current' : ''}`}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPage(p)}
            >
              {p}
            </button>
          ),
        )}
        {nav('Next page', page + 1, ChevronRight, page === totalPages)}
        {nav('Last page', totalPages, ChevronsRight, page === totalPages)}
      </div>
    </nav>
  )
}
