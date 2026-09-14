import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import { useEmployerSearch } from '@/hooks/useEmployers'
import { formatLocation, formatRating, formatReviewCount } from '@/lib/format'
import { Spinner } from '@/components/ui/spinner'
import type { EmployerSearchResult } from '@/lib/database.types'

interface EmployerComboboxProps {
  onSelect: (employer: EmployerSearchResult) => void
  /** Omit to hide the "Create …" affordance (e.g. on the browse page). */
  onCreate?: (name: string) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
  label?: string
  /** Visually hides the label but keeps it for assistive tech. */
  hideLabel?: boolean
}

/**
 * Employer typeahead, GitHub tag-picker style.
 *
 * Two behaviours matter here and both are duplicate-prevention, not
 * decoration:
 *
 *  1. Matches appear from the second keystroke, with review counts, so
 *     the existing "Tata Consultancy Services (438 reviews)" is visible
 *     long before the user finishes typing it a second time.
 *  2. "Create …" is always LAST and never pre-highlighted. Selecting an
 *     existing employer is the default path; creating is the deliberate
 *     one.
 *
 * Implements the ARIA 1.2 combobox pattern: the input keeps focus and
 * DOM focus never moves into the listbox, so screen readers announce the
 * active option via aria-activedescendant.
 */
export function EmployerCombobox({
  onSelect,
  onCreate,
  placeholder = 'Search employers…',
  autoFocus,
  className,
  label = 'Search employers',
  hideLabel = true,
}: EmployerComboboxProps) {
  const inputId = useId()
  const listboxId = `${inputId}-listbox`

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const debouncedQuery = useDebounce(query, 160)
  const { data: results = [], isFetching } = useEmployerSearch(debouncedQuery)

  const trimmed = query.trim()
  const canCreate = Boolean(onCreate) && trimmed.length >= 2

  // Hide "Create" when the typed name already matches a result exactly —
  // offering to create a duplicate of something on screen is a trap.
  const exactMatchExists = useMemo(
    () => results.some((r) => r.canonical_name.toLowerCase() === trimmed.toLowerCase()),
    [results, trimmed],
  )
  const showCreate = canCreate && !exactMatchExists

  const optionCount = results.length + (showCreate ? 1 : 0)
  const createIndex = showCreate ? results.length : -1

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  // Keep the highlighted row in view during arrow-key traversal.
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const node = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function commit(index: number) {
    if (index === createIndex && onCreate) {
      onCreate(trimmed)
      setOpen(false)
      return
    }
    const employer = results[index]
    if (employer) {
      onSelect(employer)
      setQuery('')
      setOpen(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!open) setOpen(true)
        if (optionCount > 0) setActiveIndex((i) => (i + 1) % optionCount)
        break
      case 'ArrowUp':
        event.preventDefault()
        if (optionCount > 0) setActiveIndex((i) => (i <= 0 ? optionCount - 1 : i - 1))
        break
      case 'Enter':
        if (open && activeIndex >= 0) {
          event.preventDefault()
          commit(activeIndex)
        }
        break
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        setActiveIndex(-1)
        break
      case 'Home':
        if (open && optionCount > 0) {
          event.preventDefault()
          setActiveIndex(0)
        }
        break
      case 'End':
        if (open && optionCount > 0) {
          event.preventDefault()
          setActiveIndex(optionCount - 1)
        }
        break
      case 'Tab':
        setOpen(false)
        break
      default:
        break
    }
  }

  const showPanel = open && trimmed.length >= 2
  const showEmpty = showPanel && !isFetching && results.length === 0 && !showCreate

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <label
        htmlFor={inputId}
        className={hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-ink'}
      >
        {label}
      </label>

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          autoFocus={autoFocus}
          aria-expanded={showPanel}
          aria-controls={showPanel ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${inputId}-option-${activeIndex}` : undefined
          }
          className={cn(
            'h-11 w-full rounded-lg border border-line-strong bg-canvas pr-10 pl-9',
            'text-ink placeholder:text-ink-subtle',
            'transition-[border-color] duration-150',
            'hover:border-ink-subtle',
          )}
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            // The option set is about to change underneath the highlight.
            setActiveIndex(-1)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {isFetching && trimmed.length >= 2 && (
          <span className="absolute top-1/2 right-3 -translate-y-1/2">
            <Spinner className="size-4 text-ink-subtle" label="Searching employers" />
          </span>
        )}
      </div>

      {showPanel && (
        <div
          data-motion-surface
          className={cn(
            'absolute z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-line',
            'bg-canvas shadow-popover',
          )}
        >
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Employer results"
            className="max-h-80 overflow-y-auto py-1"
          >
            {results.map((employer, index) => {
              const location = formatLocation({
                city: employer.city,
                state: employer.state,
                country: employer.country,
              })
              const rating = formatRating(employer.avg_rating)

              return (
                <li
                  key={employer.id}
                  id={`${inputId}-option-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={activeIndex === index}
                  className={cn(
                    'cursor-pointer px-3 py-2',
                    activeIndex === index ? 'bg-brand-subtle' : 'bg-transparent',
                  )}
                  onPointerEnter={() => setActiveIndex(index)}
                  // pointerdown, not click: committing on press feels
                  // immediate, and it beats the input's blur.
                  onPointerDown={(event) => {
                    event.preventDefault()
                    commit(index)
                  }}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium text-ink">
                      {employer.canonical_name}
                    </span>
                    {rating && (
                      <span className="shrink-0 text-sm text-ink-muted" data-numeric>
                        {rating} ★
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-2 text-sm text-ink-subtle">
                    <span data-numeric>{formatReviewCount(employer.review_count)}</span>
                    {location && <span className="truncate">· {location}</span>}
                  </div>
                  {employer.matched_alias && (
                    <div className="mt-0.5 text-xs text-ink-subtle">
                      also known as “{employer.matched_alias}”
                    </div>
                  )}
                </li>
              )
            })}

            {showCreate && (
              <li
                id={`${inputId}-option-${createIndex}`}
                data-index={createIndex}
                role="option"
                aria-selected={activeIndex === createIndex}
                className={cn(
                  'cursor-pointer border-t border-line px-3 py-2',
                  activeIndex === createIndex ? 'bg-brand-subtle' : 'bg-transparent',
                )}
                onPointerEnter={() => setActiveIndex(createIndex)}
                onPointerDown={(event) => {
                  event.preventDefault()
                  commit(createIndex)
                }}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-brand">
                  <Plus className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">Create “{trimmed}”</span>
                </span>
                <span className="mt-0.5 block text-xs text-ink-subtle">
                  Only if none of the employers above is the one you mean.
                </span>
              </li>
            )}
          </ul>

          {showEmpty && (
            <p className="px-3 py-6 text-center text-sm text-ink-muted">
              No employers match “{trimmed}”.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
