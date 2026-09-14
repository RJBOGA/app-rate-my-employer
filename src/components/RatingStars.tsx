import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRating } from '@/lib/format'

interface RatingStarsProps {
  value: number | null | undefined
  size?: 'sm' | 'md' | 'lg'
  /** Renders the numeric value beside the stars. */
  showValue?: boolean
  className?: string
}

const SIZES = {
  sm: { star: 'size-3.5', text: 'text-sm' },
  md: { star: 'size-4', text: 'text-base' },
  lg: { star: 'size-5', text: 'text-lg' },
} as const

/**
 * Read-only rating display.
 *
 * The stars are decorative — the accessible value is the number, which
 * screen readers get once via the wrapper's label. Five separately
 * announced star icons would be noise.
 */
export function RatingStars({ value, size = 'md', showValue = true, className }: RatingStarsProps) {
  const sizes = SIZES[size]

  if (value === null || value === undefined) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-ink-subtle', sizes.text, className)}>
        <Star className={cn(sizes.star, 'text-rating-empty')} aria-hidden="true" />
        <span>Not yet rated</span>
      </span>
    )
  }

  const rounded = Math.round(value)
  const formatted = formatRating(value)

  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      role="img"
      aria-label={`${formatted} out of 5`}
    >
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((position) => (
          <Star
            key={position}
            className={cn(
              sizes.star,
              position <= rounded ? 'fill-rating text-rating' : 'fill-transparent text-rating-empty',
            )}
            strokeWidth={1.75}
          />
        ))}
      </span>
      {showValue && (
        <span className={cn('font-semibold text-ink', sizes.text)} data-numeric aria-hidden="true">
          {formatted}
        </span>
      )}
    </span>
  )
}

/** Compact "4.3 ★" form for dense rows where five glyphs are too much. */
export function RatingValue({
  value,
  className,
}: {
  value: number | null | undefined
  className?: string
}) {
  const formatted = formatRating(value)
  if (!formatted) {
    return <span className={cn('text-ink-subtle', className)}>—</span>
  }
  return (
    <span
      className={cn('inline-flex items-baseline gap-1 font-semibold text-ink', className)}
      aria-label={`${formatted} out of 5`}
    >
      <span data-numeric>{formatted}</span>
      <Star className="size-3.5 translate-y-px fill-rating text-rating" aria-hidden="true" />
    </span>
  )
}
