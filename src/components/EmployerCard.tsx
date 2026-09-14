import { Link } from 'react-router-dom'
import { MapPin, Users } from 'lucide-react'
import { RatingValue } from '@/components/RatingStars'
import { cn } from '@/lib/utils'
import { formatCount, formatLocation, formatReviewCount } from '@/lib/format'
import { pressableSubtle } from '@/lib/motion'
import type { EmployerRankingRow } from '@/lib/database.types'

interface EmployerCardProps {
  employer: EmployerRankingRow
  /** Position in a ranked list, rendered as a quiet ordinal. */
  rank?: number
  className?: string
}

export function EmployerCard({ employer, rank, className }: EmployerCardProps) {
  if (!employer.id || !employer.canonical_name) return null

  const location = formatLocation({
    city: employer.city,
    state: employer.state,
    country: employer.country,
  })

  return (
    <Link
      to={`/employers/${employer.id}`}
      className={cn(
        'group block rounded-lg border border-line bg-canvas p-4 shadow-card',
        'hover:border-line-strong hover:shadow-raised',
        'transition-[box-shadow,border-color] duration-150',
        pressableSubtle,
        className,
      )}
    >
      <div className="flex items-start gap-4">
        {rank !== undefined && (
          <span
            className="mt-0.5 w-6 shrink-0 text-sm font-semibold text-ink-subtle"
            data-numeric
            aria-hidden="true"
          >
            {rank}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-lg text-ink group-hover:text-brand">
            {employer.canonical_name}
          </h3>

          {location && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-muted">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{location}</span>
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
            <span data-numeric>{formatReviewCount(employer.review_count)}</span>
            {(employer.employee_count ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Users className="size-3.5" aria-hidden="true" />
                <span data-numeric>
                  {formatCount(employer.employee_count)}{' '}
                  {employer.employee_count === 1 ? 'employee' : 'employees'}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Only the plain average is shown. The Bayesian sort key that
            decided this row's position is never surfaced. */}
        <div className="shrink-0 text-right">
          <RatingValue value={employer.avg_rating} className="text-lg" />
        </div>
      </div>
    </Link>
  )
}
