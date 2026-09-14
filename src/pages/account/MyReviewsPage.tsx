import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMyReviews } from '@/hooks/useReviews'
import { PRIVACY_FIELDS } from '@/lib/constants'
import { formatRelativeDate } from '@/lib/format'
import { RatingStars } from '@/components/RatingStars'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, ListSkeleton, ReviewSkeleton, PageSpinner } from '@/components/States'
import type { ReviewRow } from '@/lib/database.types'

function reviewStatusBadge(status: ReviewRow['status']) {
  switch (status) {
    case 'published':
      return <Badge variant="positive">Published</Badge>
    case 'hidden':
      return <Badge variant="caution">Hidden</Badge>
    case 'removed':
      return <Badge variant="critical">Removed</Badge>
  }
}

function privacyCount(review: ReviewRow): number {
  return PRIVACY_FIELDS.filter((f) => review[f.key as keyof ReviewRow] === true).length
}

export function MyReviewsPage() {
  const { user } = useAuth()
  const reviewsQuery = useMyReviews(user?.id ?? null)

  if (!user) return <PageSpinner />

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="display-lg">My Reviews</h1>
      <p className="mt-2 text-ink-muted">
        All reviews you have submitted. Edit a review to update its content or
        adjust which details are publicly visible.
      </p>

      <div className="mt-8">
        {reviewsQuery.isLoading && (
          <ListSkeleton count={3}>
            <ReviewSkeleton />
          </ListSkeleton>
        )}

        {reviewsQuery.isError && (
          <ErrorState
            error={reviewsQuery.error}
            onRetry={() => void reviewsQuery.refetch()}
          />
        )}

        {reviewsQuery.isSuccess && reviewsQuery.data.length === 0 && (
          <EmptyState
            title="No reviews yet"
            description="Share your experience with a desi staffing employer to help others in the community."
            action={
              <Button asChild>
                <Link to="/review">Write your first review</Link>
              </Button>
            }
          />
        )}

        {reviewsQuery.isSuccess && reviewsQuery.data.length > 0 && (
          <ul className="divide-y divide-line" role="list">
            {reviewsQuery.data.map((review) => {
              const employer = review.employers
              const employerId = employer?.id ?? review.employer_id
              const employerName = employer?.canonical_name ?? 'Unknown employer'
              const pubCount = privacyCount(review)
              const isRemoved = review.status === 'removed'

              return (
                <li key={review.id} className="py-6">
                  {/* Header row */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/employers/${employerId}`}
                        className="font-semibold text-ink hover:text-brand"
                      >
                        {employerName}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <RatingStars value={review.overall_rating} size="sm" />
                        {reviewStatusBadge(review.status)}
                        <span className="text-xs text-ink-subtle">
                          Updated {formatRelativeDate(review.updated_at)}
                        </span>
                      </div>
                    </div>

                    {/* Privacy summary */}
                    <span className="shrink-0 rounded-md bg-privacy-subtle px-2 py-0.5 text-xs font-medium text-privacy">
                      {pubCount === 0 ? 'Anonymous' : `Showing ${pubCount} detail${pubCount === 1 ? '' : 's'}`}
                    </span>
                  </div>

                  {/* Title */}
                  <p className="mt-2 font-medium text-ink">{review.title}</p>

                  {/* Moderation notices */}
                  {review.status === 'hidden' && (
                    <p
                      role="note"
                      className="mt-3 rounded-md bg-caution-subtle px-3 py-2 text-sm text-caution"
                    >
                      This review is hidden by a moderator and is not publicly visible. You can
                      still edit it.
                    </p>
                  )}

                  {review.status === 'removed' && (
                    <p
                      role="note"
                      className="mt-3 rounded-md bg-critical-subtle px-3 py-2 text-sm text-critical"
                    >
                      This review has been removed by a moderator and is no longer editable.
                    </p>
                  )}

                  {/* Actions */}
                  {!isRemoved && (
                    <div className="mt-3">
                      <Button asChild variant="secondary" size="sm">
                        <Link to={`/employers/${employerId}/review`}>Edit review</Link>
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
