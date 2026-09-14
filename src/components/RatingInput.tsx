import { useId, useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingInputProps {
  value: number | null
  onChange: (value: number) => void
  label: string
  description?: string
  error?: string
  size?: 'md' | 'lg'
  layout?: 'stacked' | 'row'
}

const LABELS = ['Poor', 'Below average', 'Average', 'Good', 'Excellent'] as const

/**
 * Accessible star rating input.
 *
 * Implemented as a radio group rather than buttons, so arrow keys move
 * between values and the current selection is announced — the behaviour
 * a keyboard user already expects from a set of mutually exclusive
 * options. Hover/focus previews the value without committing it.
 */
export function RatingInput({
  value,
  onChange,
  label,
  description,
  error,
  size = 'md',
  layout = 'stacked',
}: RatingInputProps) {
  const groupId = useId()
  const errorId = `${groupId}-error`
  const descriptionId = `${groupId}-description`
  const [preview, setPreview] = useState<number | null>(null)

  const shown = preview ?? value ?? 0
  const starSize = size === 'lg' ? 'size-8' : 'size-6'

  return (
    <div
      className={cn(
        layout === 'row' && 'sm:flex sm:items-center sm:justify-between sm:gap-6',
        'py-1',
      )}
    >
      <div className={cn(layout === 'row' && 'sm:flex-1')}>
        <div id={groupId} className="text-sm font-medium text-ink">
          {label}
        </div>
        {description && (
          <p id={descriptionId} className="mt-0.5 text-sm text-ink-muted">
            {description}
          </p>
        )}
      </div>

      <div className={cn('mt-2', layout === 'row' && 'sm:mt-0 sm:shrink-0')}>
        <div
          role="radiogroup"
          aria-labelledby={groupId}
          aria-describedby={cn(description && descriptionId, error && errorId) || undefined}
          aria-required="true"
          aria-invalid={error ? true : undefined}
          className="flex items-center gap-1"
          onMouseLeave={() => setPreview(null)}
        >
          {[1, 2, 3, 4, 5].map((position) => {
            const selected = value === position
            const filled = position <= shown
            return (
              <button
                key={position}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${position} — ${LABELS[position - 1]}`}
                // Roving tabindex: the group is one tab stop, arrows move within it.
                tabIndex={selected || (value === null && position === 1) ? 0 : -1}
                className={cn(
                  'rounded-sm p-0.5 transition-transform duration-100 ease-out',
                  'active:scale-90 motion-reduce:active:scale-100',
                  'hover:scale-110 motion-reduce:hover:scale-100',
                )}
                onPointerEnter={() => setPreview(position)}
                onFocus={() => setPreview(position)}
                onBlur={() => setPreview(null)}
                onClick={() => onChange(position)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                    event.preventDefault()
                    onChange(Math.min(5, (value ?? 0) + 1))
                  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                    event.preventDefault()
                    onChange(Math.max(1, (value ?? 2) - 1))
                  }
                }}
              >
                <Star
                  className={cn(
                    starSize,
                    filled ? 'fill-rating text-rating' : 'fill-transparent text-rating-empty',
                  )}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </button>
            )
          })}

          <span
            className="ml-2 min-w-[6.5rem] text-sm text-ink-muted"
            aria-hidden="true"
          >
            {shown > 0 ? LABELS[shown - 1] : ''}
          </span>
        </div>

        {error && (
          <p id={errorId} role="alert" className="mt-1 text-sm text-critical">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
