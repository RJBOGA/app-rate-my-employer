import { cn } from '@/lib/utils'
import { RATING_CATEGORIES, type RatingCategoryKey } from '@/lib/constants'
import { formatRating } from '@/lib/format'

interface CategoryBreakdownProps {
  /** Partial so this works for both a single review (integers) and an
   *  employer aggregate (decimals, possibly null when unrated). */
  values: Partial<Record<RatingCategoryKey, number | null>>
  compact?: boolean
  className?: string
}

/**
 * The seven supporting categories.
 *
 * Bars are sized off the value and carry no accessible role — the
 * number beside each label is the real content, and it is read out in
 * a definition list so the label/value pairing survives linearisation.
 */
export function CategoryBreakdown({ values, compact, className }: CategoryBreakdownProps) {
  return (
    <dl className={cn('divide-y divide-line', className)}>
      {RATING_CATEGORIES.map((category) => {
        const value = values[category.key] ?? null
        const formatted = formatRating(value)
        const pct = value === null ? 0 : (value / 5) * 100

        return (
          <div
            key={category.key}
            className={cn(
              'grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1',
              compact ? 'py-1.5' : 'py-2.5',
            )}
          >
            <dt className={cn('text-ink', compact ? 'text-sm' : 'text-sm font-medium')}>
              {category.label}
              {!compact && (
                <span className="mt-0.5 block text-xs font-normal text-ink-subtle">
                  {category.help}
                </span>
              )}
            </dt>
            <dd className="flex items-center gap-3">
              <div
                className={cn(
                  'h-1.5 overflow-hidden rounded-full bg-canvas-sunken',
                  compact ? 'w-20' : 'w-28',
                )}
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-rating transition-[width] duration-300 ease-out motion-reduce:transition-none"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span
                className="w-8 text-right text-sm font-semibold text-ink"
                data-numeric
              >
                {formatted ?? '—'}
              </span>
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
