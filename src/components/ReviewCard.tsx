import { ExternalLink, Flag, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RatingStars } from '@/components/RatingStars'
import { CategoryBreakdown } from '@/components/CategoryBreakdown'
import { cn } from '@/lib/utils'
import {
  formatAbsoluteDate,
  formatDuration,
  formatEmploymentStatus,
  formatRelativeDate,
} from '@/lib/format'
import type { PublicReviewRow } from '@/lib/database.types'

interface ReviewCardProps {
  review: PublicReviewRow
  onReport?: (reviewId: string) => void
  /** Marks the caller's own review and swaps Report for Edit. */
  isOwn?: boolean
  onEdit?: () => void
  className?: string
}

/**
 * A single public review.
 *
 * Everything identity-related here arrives already filtered by the
 * database view: a null `reviewer_name` means the author did not opt in,
 * not that the name is missing. The component renders exactly what it is
 * given and never reaches for a fallback identity.
 */
export function ReviewCard({ review, onReport, isOwn, onEdit, className }: ReviewCardProps) {
  const duration = formatDuration(review.employment_duration_months)
  const isAnonymous = !review.reviewer_name

  const bylineParts = [formatEmploymentStatus(review.employment_status), duration].filter(Boolean)

  return (
    <article
      className={cn('border-b border-line py-6 first:pt-0 last:border-b-0', className)}
      aria-labelledby={review.id ? `review-title-${review.id}` : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        {/* ---- Reviewer identity ---- */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'font-medium',
                isAnonymous ? 'text-ink-muted' : 'text-ink',
              )}
            >
              {review.reviewer_name ?? 'Anonymous'}
            </span>

            {isAnonymous && (
              <Badge variant="privacy" className="gap-1">
                <ShieldCheck className="size-3" aria-hidden="true" />
                Private
              </Badge>
            )}

            {isOwn && <Badge variant="brand">Your review</Badge>}

            {review.linkedin_url && (
              <a
                href={review.linkedin_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
              >
                LinkedIn
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            )}
          </div>

          <p className="mt-0.5 text-sm text-ink-muted">{bylineParts.join(' · ')}</p>

          {(review.job_title || review.project_client || review.employment_location) && (
            <p className="mt-0.5 text-sm text-ink-muted">
              {[review.job_title, review.project_client, review.employment_location]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>

        {/* ---- Rating + date ---- */}
        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
          <RatingStars value={review.overall_rating} size="sm" />
          <time
            className="text-xs text-ink-subtle"
            dateTime={review.created_at ?? undefined}
            title={formatAbsoluteDate(review.created_at)}
          >
            {formatRelativeDate(review.created_at)}
            {review.updated_at && review.created_at && review.updated_at !== review.created_at
              ? ' · edited'
              : ''}
          </time>
        </div>
      </div>

      {/* ---- Body ---- */}
      <h3
        id={review.id ? `review-title-${review.id}` : undefined}
        className="mt-4 text-lg font-semibold text-ink"
      >
        {review.title}
      </h3>

      <p className="mt-2 whitespace-pre-line text-ink-muted">{review.body}</p>

      {(review.pros || review.cons) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {review.pros && (
            <div className="rounded-lg border border-line bg-positive-subtle/40 p-3">
              <p className="eyebrow text-positive">Pros</p>
              <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">{review.pros}</p>
            </div>
          )}
          {review.cons && (
            <div className="rounded-lg border border-line bg-critical-subtle/40 p-3">
              <p className="eyebrow text-critical">Cons</p>
              <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">{review.cons}</p>
            </div>
          )}
        </div>
      )}

      <details className="group mt-4">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-brand hover:underline">
          Category ratings
          <span className="text-ink-subtle transition-transform group-open:rotate-180" aria-hidden="true">
            ▾
          </span>
        </summary>
        <div className="mt-3 max-w-md">
          <CategoryBreakdown
            values={{
              rating_pay: review.rating_pay,
              rating_communication: review.rating_communication,
              rating_job_stability: review.rating_job_stability,
              rating_project_quality: review.rating_project_quality,
              rating_visa_support: review.rating_visa_support,
              rating_transparency: review.rating_transparency,
              rating_management: review.rating_management,
            }}
            compact
          />
        </div>
      </details>

      <div className="mt-4 flex items-center gap-2">
        {isOwn && onEdit && (
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit your review
          </Button>
        )}
        {!isOwn && onReport && review.id && (
          <Button
            variant="ghost"
            size="sm"
            className="text-ink-subtle"
            onClick={() => onReport(review.id as string)}
          >
            <Flag className="size-3.5" aria-hidden="true" />
            Report
          </Button>
        )}
      </div>
    </article>
  )
}
