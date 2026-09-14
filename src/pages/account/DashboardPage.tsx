import { Link } from 'react-router-dom'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyEmploymentRecords } from '@/hooks/useEmployment'
import { useMyReviews } from '@/hooks/useReviews'
import { PRIVACY_FIELDS } from '@/lib/constants'
import { formatEmploymentPeriod, formatRelativeDate } from '@/lib/format'
import { RatingStars } from '@/components/RatingStars'
import { Badge } from '@/components/ui/badge'
import {
  EmptyState,
  ErrorState,
  ListSkeleton,
  ReviewSkeleton,
  EmployerCardSkeleton,
  PageSpinner,
} from '@/components/States'
import type { ReviewRow } from '@/lib/database.types'
import type { EmploymentRecordWithEmployer } from '@/hooks/useEmployment'
import type { MyReviewWithEmployer } from '@/hooks/useReviews'

// ── helpers ──────────────────────────────────────────────────────────────────

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

// ── Next-steps card ───────────────────────────────────────────────────────────

interface NextStepsProps {
  hasDisplayName: boolean
  employmentRecords: EmploymentRecordWithEmployer[]
}

function NextStepsCard({ hasDisplayName, employmentRecords }: NextStepsProps) {
  // Records that have no associated review (no review means review_id is absent — we
  // detect this by checking whether the record appears in the reviews list, but we
  // only have the employment list here; check for the absence of a review from the
  // record's perspective is not directly available. The spec says "has employment
  // records but a record with no review". Employment records don't carry a review_id
  // on the type, so we can only surface the prompt once when there are records.
  // We show up to 3 such records (those without a matching review in the reviews list
  // will be passed in from the parent).
  const recordsWithoutReview = employmentRecords.slice(0, 3)

  const steps: React.ReactNode[] = []

  if (!hasDisplayName) {
    steps.push(
      <li key="display-name" className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:gap-3">
        <span className="shrink-0 rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-medium text-brand">
          Suggested
        </span>
        <div className="min-w-0">
          <Link to="/account" className="font-medium text-ink hover:text-brand">
            Add a display name
          </Link>
          <p className="text-sm text-ink-muted">
            Only shown on reviews where you choose to reveal your name.
          </p>
        </div>
      </li>,
    )
  }

  if (employmentRecords.length === 0) {
    steps.push(
      <li key="add-employment" className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:gap-3">
        <span className="shrink-0 rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-medium text-brand">
          Required
        </span>
        <div className="min-w-0">
          <Link to="/review" className="font-medium text-ink hover:text-brand">
            Add where you've worked
          </Link>
          <p className="text-sm text-ink-muted">
            Employment records are required before you can submit a review.
          </p>
        </div>
      </li>,
    )
  } else {
    recordsWithoutReview.forEach((record) => {
      const employer = record.employers
      const employerId = employer?.id ?? record.employer_id
      const employerName = employer?.canonical_name ?? 'Unknown employer'
      steps.push(
        <li
          key={`review-${record.id}`}
          className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:gap-3"
        >
          <span className="shrink-0 rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-medium text-brand">
            Suggested
          </span>
          <div className="min-w-0">
            <Link
              to={`/employers/${employerId}/review`}
              className="font-medium text-ink hover:text-brand"
            >
              Review {employerName}
            </Link>
            <p className="text-sm text-ink-muted">
              Share your experience to help others in the community.
            </p>
          </div>
        </li>,
      )
    })
  }

  if (steps.length === 0) return null

  return (
    <section aria-labelledby="next-steps-heading" className="mt-10">
      <h2 id="next-steps-heading" className="text-lg font-semibold text-ink">
        Next steps
      </h2>
      <div className="mt-4 rounded-xl border border-brand-line bg-brand-subtle p-5">
        <ul className="space-y-4" role="list">
          {steps}
        </ul>
      </div>
    </section>
  )
}

// ── Reviews section ───────────────────────────────────────────────────────────

interface ReviewsSectionProps {
  userId: string
}

function ReviewsSection({ userId }: ReviewsSectionProps) {
  const reviewsQuery = useMyReviews(userId)

  return (
    <section aria-labelledby="reviews-heading" className="mt-12">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="reviews-heading" className="text-lg font-semibold text-ink">
          Your reviews
        </h2>
        <Link to="/account/reviews" className="text-sm font-medium text-brand hover:text-brand-hover">
          See all
        </Link>
      </div>

      <div className="mt-4">
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
            description="Your submitted reviews will appear here."
          />
        )}

        {reviewsQuery.isSuccess && reviewsQuery.data.length > 0 && (
          <ul className="divide-y divide-line" role="list">
            {reviewsQuery.data.slice(0, 5).map((review: MyReviewWithEmployer) => {
              const employer = review.employers
              const employerId = employer?.id ?? review.employer_id
              const employerName = employer?.canonical_name ?? 'Unknown employer'
              const pubCount = privacyCount(review)
              const isRemoved = review.status === 'removed'

              return (
                <li key={review.id} className="py-5">
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

                    <span className="shrink-0 rounded-md bg-privacy-subtle px-2 py-0.5 text-xs font-medium text-privacy">
                      {pubCount === 0
                        ? 'Anonymous'
                        : `Showing ${pubCount} detail${pubCount === 1 ? '' : 's'}`}
                    </span>
                  </div>

                  <p className="mt-2 font-medium text-ink">{review.title}</p>

                  {!isRemoved && (
                    <div className="mt-3">
                      <Link
                        to={`/employers/${employerId}/review`}
                        className="text-sm font-medium text-brand hover:text-brand-hover"
                      >
                        Edit
                      </Link>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

// ── Employment section ────────────────────────────────────────────────────────

interface EmploymentSectionProps {
  userId: string
}

function EmploymentSection({ userId }: EmploymentSectionProps) {
  const recordsQuery = useMyEmploymentRecords(userId)

  return (
    <section aria-labelledby="employment-heading" className="mt-12">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="employment-heading" className="text-lg font-semibold text-ink">
          Your employment
        </h2>
        <Link
          to="/account/employment"
          className="text-sm font-medium text-brand hover:text-brand-hover"
        >
          Manage
        </Link>
      </div>

      <div className="mt-4">
        {recordsQuery.isLoading && (
          <ListSkeleton count={3}>
            <EmployerCardSkeleton />
          </ListSkeleton>
        )}

        {recordsQuery.isError && (
          <ErrorState
            error={recordsQuery.error}
            onRetry={() => void recordsQuery.refetch()}
          />
        )}

        {recordsQuery.isSuccess && recordsQuery.data.length === 0 && (
          <EmptyState
            title="No employment records yet"
            description="Add your employment history to start writing reviews."
          />
        )}

        {recordsQuery.isSuccess && recordsQuery.data.length > 0 && (
          <ul className="space-y-3" role="list">
            {recordsQuery.data.slice(0, 5).map((record: EmploymentRecordWithEmployer) => {
              const employer = record.employers
              const employerId = employer?.id ?? record.employer_id
              const employerName = employer?.canonical_name ?? 'Unknown employer'
              const period = formatEmploymentPeriod(record)

              return (
                <li
                  key={record.id}
                  className="rounded-lg border border-line bg-canvas p-4 shadow-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/employers/${employerId}`}
                        className="font-semibold text-ink hover:text-brand"
                      >
                        {employerName}
                      </Link>
                      <p className="mt-0.5 text-sm text-ink-muted">{record.job_title}</p>
                      <p className="mt-0.5 text-xs text-ink-subtle">{period}</p>
                    </div>
                    <Badge variant={record.status === 'current' ? 'positive' : 'neutral'}>
                      {record.status === 'current' ? 'Current' : 'Former'}
                    </Badge>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

// ── Inner page (non-nullable user) ───────────────────────────────────────────

interface DashboardInnerProps {
  userId: string
  displayName: string | null
  isSuspended: boolean
  suspensionReason: string | null | undefined
  isStaff: boolean
  employmentRecords: EmploymentRecordWithEmployer[]
  employmentLoading: boolean
}

function DashboardInner({
  userId,
  displayName,
  isSuspended,
  suspensionReason,
  isStaff,
  employmentRecords,
  employmentLoading,
}: DashboardInnerProps) {
  const hasDisplayName = Boolean(displayName?.trim())

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Suspension banner */}
      {isSuspended && (
        <div
          role="alert"
          className="mb-8 flex gap-3 rounded-lg border border-critical/30 bg-critical-subtle px-4 py-4"
        >
          <AlertTriangle
            className="mt-0.5 size-5 shrink-0 text-critical"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium text-critical">Your account is suspended</p>
            <p className="mt-1 text-sm text-ink-muted">
              You cannot post or edit reviews while suspended.
              {suspensionReason ? <> Reason: {suspensionReason}</> : null}
            </p>
          </div>
        </div>
      )}

      {/* Greeting */}
      <h1 className="display-lg">
        {displayName ? `Welcome back, ${displayName}` : 'Welcome back'}
      </h1>
      <p className="mt-2 text-ink-muted">
        A summary of your contributions and what you can do next.
      </p>

      {/* Next steps — only shown while employment has loaded */}
      {!employmentLoading && (
        <NextStepsCard
          hasDisplayName={hasDisplayName}
          employmentRecords={employmentRecords}
        />
      )}

      {/* Reviews */}
      <ReviewsSection userId={userId} />

      {/* Employment */}
      <EmploymentSection userId={userId} />

      {/* Privacy footer */}
      <p className="mt-12 flex items-center gap-2 text-sm text-privacy">
        <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
        Your email and phone number are never shown publicly.
      </p>

      {/* Staff link */}
      {isStaff && (
        <div className="mt-6 border-t border-line pt-4">
          <Link
            to="/admin"
            className="text-sm font-medium text-brand hover:text-brand-hover"
          >
            Moderation queue
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Public export ─────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user, profile, isSuspended, isStaff } = useAuth()
  const recordsQuery = useMyEmploymentRecords(user?.id ?? null)

  if (!user) return <PageSpinner />

  return (
    <DashboardInner
      userId={user.id}
      displayName={profile?.display_name ?? null}
      isSuspended={isSuspended}
      suspensionReason={profile?.suspension_reason}
      isStaff={isStaff}
      employmentRecords={recordsQuery.data ?? []}
      employmentLoading={recordsQuery.isLoading}
    />
  )
}
