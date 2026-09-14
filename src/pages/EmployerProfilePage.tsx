import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ExternalLink, Flag, MapPin, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RatingStars } from '@/components/RatingStars'
import { CategoryBreakdown } from '@/components/CategoryBreakdown'
import { ReviewCard } from '@/components/ReviewCard'
import { ReportDialog } from '@/components/ReportDialog'
import { EmptyState, ErrorState, ListSkeleton, PageSpinner, ReviewSkeleton } from '@/components/States'
import { useEmployer, useEmployerAliases, useEmployerStats } from '@/hooks/useEmployers'
import { usePublicReviews, useMyReview, type ReviewSort } from '@/hooks/useReviews'
import { useAuth } from '@/hooks/useAuth'
import {
  formatCount,
  formatLocation,
  formatPercent,
  formatReviewCount,
  formatWebsiteLabel,
} from '@/lib/format'
import type { ReportTargetType } from '@/lib/database.types'

export function EmployerProfilePage() {
  const { employerId } = useParams<{ employerId: string }>()
  const { user } = useAuth()

  const [sort, setSort] = useState<ReviewSort>('newest')
  const [reportTarget, setReportTarget] = useState<{
    type: ReportTargetType
    id: string
  } | null>(null)

  const employerQuery = useEmployer(employerId)
  const statsQuery = useEmployerStats(employerId)
  const aliasesQuery = useEmployerAliases(employerId)
  const reviewsQuery = usePublicReviews(employerId, sort)
  const myReviewQuery = useMyReview(employerId, user?.id ?? null)

  const employer = employerQuery.data
  const stats = statsQuery.data

  useEffect(() => {
    if (employer?.canonical_name) {
      document.title = `${employer.canonical_name} — Rate My Desi Employer`
    }
    return () => {
      document.title = 'Rate My Desi Employer'
    }
  }, [employer?.canonical_name])

  if (employerQuery.isPending) return <PageSpinner label="Loading employer" />

  if (employerQuery.isError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <ErrorState error={employerQuery.error} onRetry={() => void employerQuery.refetch()} />
      </div>
    )
  }

  if (!employer) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          title="Employer not found"
          description="This employer may have been removed."
          action={
            <Button asChild>
              <Link to="/search">Browse employers</Link>
            </Button>
          }
        />
      </div>
    )
  }

  // A merged employer is a redirect, not a dead end — old links and
  // bookmarks should land on the surviving record.
  if (employer.status === 'merged' && employer.merged_into_id) {
    return <Navigate to={`/employers/${employer.merged_into_id}`} replace />
  }

  if (employer.status === 'removed') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          title="This employer has been removed"
          description="A moderator removed this entry from the directory."
          action={
            <Button asChild>
              <Link to="/search">Browse employers</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const location = formatLocation({
    city: employer.city,
    state: employer.state,
    country: employer.country,
  })
  const websiteLabel = formatWebsiteLabel(employer.website)
  const employeeCount = stats?.employee_count ?? 0
  const hasBreakdown = employeeCount > 0
  const myReview = myReviewQuery.data

  return (
    <>
      {/* ---- Header -------------------------------------------------- */}
      <section className="border-b border-line bg-canvas-subtle">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0">
              {employer.status === 'hidden' && (
                <Badge variant="caution" className="mb-2">
                  Hidden by a moderator
                </Badge>
              )}

              <h1 className="display-lg text-ink">{employer.canonical_name}</h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {location}
                  </span>
                )}
                {employer.website && websiteLabel && (
                  <a
                    href={employer.website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="flex items-center gap-1 text-brand hover:underline"
                  >
                    {websiteLabel}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                )}
              </div>

              {aliasesQuery.data && aliasesQuery.data.length > 0 && (
                <p className="mt-2 text-sm text-ink-subtle">
                  Also known as{' '}
                  {aliasesQuery.data.map((alias) => alias.alias).join(', ')}
                </p>
              )}

              {employer.description && (
                <p className="mt-4 max-w-2xl text-ink-muted">{employer.description}</p>
              )}
            </div>

            <div className="flex shrink-0 flex-col items-start gap-3">
              <Button asChild>
                <Link to={`/employers/${employer.id}/review`}>
                  <PenLine className="size-4" aria-hidden="true" />
                  {myReview ? 'Edit your review' : 'Write a review'}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-ink-subtle"
                onClick={() => setReportTarget({ type: 'employer', id: employer.id })}
              >
                <Flag className="size-3.5" aria-hidden="true" />
                Report this employer
              </Button>
            </div>
          </div>

          {/* ---- Headline numbers ---- */}
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            <div>
              <dt className="eyebrow">Overall rating</dt>
              <dd className="mt-1">
                <RatingStars value={stats?.avg_rating ?? null} size="lg" />
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Reviews</dt>
              <dd className="mt-1 text-2xl font-semibold text-ink" data-numeric>
                {formatCount(stats?.review_count)}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Employees / reviewers</dt>
              <dd className="mt-1 text-2xl font-semibold text-ink" data-numeric>
                {formatCount(employeeCount)}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Current / former</dt>
              <dd className="mt-1 text-ink">
                {hasBreakdown ? (
                  <span className="text-base" data-numeric>
                    <span className="font-semibold">
                      {formatPercent(stats?.current_employee_count ?? 0, employeeCount)}
                    </span>{' '}
                    <span className="text-ink-muted">current</span>
                    {' · '}
                    <span className="font-semibold">
                      {formatPercent(stats?.former_employee_count ?? 0, employeeCount)}
                    </span>{' '}
                    <span className="text-ink-muted">former</span>
                  </span>
                ) : (
                  <span className="text-base text-ink-subtle">—</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_18rem] lg:items-start">
          {/* ---- Reviews --------------------------------------------- */}
          <section aria-labelledby="reviews-heading" className="lg:order-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="reviews-heading" className="font-serif text-2xl text-ink">
                Reviews
              </h2>

              {(stats?.review_count ?? 0) > 1 && (
                <div className="flex items-center gap-2">
                  <label htmlFor="review-sort" className="text-sm text-ink-muted">
                    Sort
                  </label>
                  <Select value={sort} onValueChange={(value) => setSort(value as ReviewSort)}>
                    <SelectTrigger id="review-sort" className="h-9 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Most recent</SelectItem>
                      <SelectItem value="highest">Highest rated</SelectItem>
                      <SelectItem value="lowest">Lowest rated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <p className="mt-1 text-sm text-ink-muted" data-numeric>
              {formatReviewCount(stats?.review_count)}
            </p>

            <div className="mt-4">
              {reviewsQuery.isPending ? (
                <ListSkeleton count={3}>
                  <ReviewSkeleton />
                </ListSkeleton>
              ) : reviewsQuery.isError ? (
                <ErrorState
                  error={reviewsQuery.error}
                  onRetry={() => void reviewsQuery.refetch()}
                />
              ) : reviewsQuery.data.length === 0 ? (
                <EmptyState
                  title="No reviews yet"
                  description="If you have worked here, yours would be the first — and the most useful."
                  action={
                    <Button asChild>
                      <Link to={`/employers/${employer.id}/review`}>Write a review</Link>
                    </Button>
                  }
                />
              ) : (
                <div>
                  {reviewsQuery.data.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      isOwn={Boolean(myReview && review.id === myReview.id)}
                      onReport={(reviewId) => setReportTarget({ type: 'review', id: reviewId })}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ---- Category ratings ------------------------------------ */}
          <aside aria-labelledby="categories-heading" className="lg:order-2">
            <div className="rounded-lg border border-line bg-canvas p-4 shadow-card lg:sticky lg:top-20">
              <h2 id="categories-heading" className="font-medium text-ink">
                Category ratings
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Averaged across {formatReviewCount(stats?.review_count).toLowerCase()}.
              </p>

              <div className="mt-3">
                <CategoryBreakdown
                  compact
                  values={{
                    rating_pay: stats?.avg_pay ?? null,
                    rating_communication: stats?.avg_communication ?? null,
                    rating_job_stability: stats?.avg_job_stability ?? null,
                    rating_project_quality: stats?.avg_project_quality ?? null,
                    rating_visa_support: stats?.avg_visa_support ?? null,
                    rating_transparency: stats?.avg_transparency ?? null,
                    rating_management: stats?.avg_management ?? null,
                  }}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>

      <ReportDialog
        open={reportTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReportTarget(null)
        }}
        targetType={reportTarget?.type ?? 'review'}
        targetId={reportTarget?.id ?? null}
      />
    </>
  )
}
