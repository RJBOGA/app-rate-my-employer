import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RatingInput } from '@/components/RatingInput'
import { PrivacyControls, type PrivacyFlags } from '@/components/PrivacyControls'
import { EmploymentRecordForm } from '@/components/EmploymentRecordForm'
import { EmptyState, ErrorState, PageSpinner } from '@/components/States'
import { useAuth } from '@/hooks/useAuth'
import { useEmployer } from '@/hooks/useEmployers'
import { useMyEmploymentRecord, useUpsertEmploymentRecord } from '@/hooks/useEmployment'
import { useCreateReview, useMyReview, useUpdateReview } from '@/hooks/useReviews'
import { RATING_CATEGORIES, REVIEW_SAFETY_NOTICE, type RatingCategoryKey } from '@/lib/constants'
import { DEFAULT_PRIVACY_FLAGS, reviewSchema, fieldErrors, type ReviewInput } from '@/lib/validation'
import { formatEmploymentPeriod } from '@/lib/format'
import { toUserMessage } from '@/lib/errors'
import type { ReviewRow } from '@/lib/database.types'

type CategoryValues = Record<RatingCategoryKey, number | null>

const EMPTY_CATEGORIES: CategoryValues = {
  rating_pay: null,
  rating_communication: null,
  rating_job_stability: null,
  rating_project_quality: null,
  rating_visa_support: null,
  rating_transparency: null,
  rating_management: null,
}

/**
 * Write or edit a review.
 *
 * Two gates precede the form, both deliberate:
 *   1. The employer must exist and be active (resolved on the previous
 *      page, where the duplicate check lives).
 *   2. The user must have an employment record here. The review is tied
 *      to it — that is what lets "Current employee · 2 years" be shown
 *      without the reviewer typing it into the review text.
 *
 * Edit mode is the same form with the same rules. `status` is never sent:
 * the authenticated role's UPDATE grant excludes it, so an author cannot
 * un-hide a review a moderator hid.
 */
export function WriteReviewPage() {
  const { employerId } = useParams<{ employerId: string }>()
  const navigate = useNavigate()
  const { user, profile, isSuspended } = useAuth()

  const employerQuery = useEmployer(employerId)
  const recordQuery = useMyEmploymentRecord(employerId, user?.id ?? null)
  const myReviewQuery = useMyReview(employerId, user?.id ?? null)

  const upsertRecord = useUpsertEmploymentRecord()
  const [recordError, setRecordError] = useState<string | null>(null)

  const employer = employerQuery.data
  const record = recordQuery.data
  const existing = myReviewQuery.data ?? null

  useEffect(() => {
    if (employer?.canonical_name) {
      document.title = `${existing ? 'Edit your review' : 'Review'} — ${employer.canonical_name}`
    }
    return () => {
      document.title = 'Rate My Desi Employer'
    }
  }, [employer?.canonical_name, existing])

  if (!user) return <PageSpinner />

  if (isSuspended) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div role="alert" className="rounded-lg border border-critical/30 bg-critical-subtle p-6">
          <h1 className="font-serif text-xl text-ink">Your account is suspended</h1>
          <p className="mt-2 text-ink-muted">
            Suspended accounts cannot post or edit reviews. Existing content has not been
            deleted.
          </p>
        </div>
      </div>
    )
  }

  if (employerQuery.isPending || recordQuery.isPending || myReviewQuery.isPending) {
    return <PageSpinner label="Loading" />
  }

  if (employerQuery.isError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <ErrorState error={employerQuery.error} onRetry={() => void employerQuery.refetch()} />
      </div>
    )
  }

  if (!employer || employer.status !== 'active') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          title="This employer is not available for review"
          description="It may have been merged into another entry or removed."
          action={
            <Button asChild>
              <Link to="/review">Find your employer</Link>
            </Button>
          }
        />
      </div>
    )
  }

  if (existing?.status === 'removed') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={<AlertTriangle className="size-8" />}
          title="This review was removed by a moderator"
          description="Removed reviews cannot be edited or re-submitted. If you believe this was a mistake, please contact the moderation team."
          action={
            <Button variant="secondary" asChild>
              <Link to={`/employers/${employer.id}`}>Back to employer</Link>
            </Button>
          }
        />
      </div>
    )
  }

  // ---- Gate 2: employment record -------------------------------------
  if (!record) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <BackLink employerId={employer.id} name={employer.canonical_name} />
        <h1 className="display-lg mt-4 text-ink">First, your role here</h1>
        <p className="mt-2 text-ink-muted">
          Your review is attached to an employment record so readers can see whether it
          comes from a current or former employee — the one detail that is always shown.
          Everything else in this record stays private unless you choose to publish it.
        </p>

        <Card className="mt-8">
          <CardContent className="pt-6">
            <EmploymentRecordForm
              employerId={employer.id}
              employerName={employer.canonical_name}
              submitting={upsertRecord.isPending}
              submitLabel="Save and continue"
              serverError={recordError}
              onSubmit={(input) => {
                setRecordError(null)
                upsertRecord.mutate(
                  { userId: user.id, input },
                  { onError: (err) => setRecordError(toUserMessage(err)) },
                )
              }}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ReviewForm
      key={existing?.id ?? 'new'}
      employerId={employer.id}
      employerName={employer.canonical_name}
      employmentRecordId={record.id}
      userId={user.id}
      existing={existing}
      recordSummary={formatEmploymentPeriod(record)}
      recordStatus={record.status}
      availability={{
        show_name: Boolean(profile?.display_name),
        show_linkedin: Boolean(profile?.linkedin_url),
        show_project_client: Boolean(record.project_client),
        show_employment_location: Boolean(record.location),
        show_job_title: true,
        show_employment_duration: true,
      }}
      onSaved={() => navigate(`/employers/${employer.id}`, { replace: true })}
    />
  )
}

function BackLink({ employerId, name }: { employerId: string; name: string }) {
  return (
    <Link
      to={`/employers/${employerId}`}
      className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-brand"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {name}
    </Link>
  )
}

// =====================================================================
// The form proper
// =====================================================================

interface ReviewFormProps {
  employerId: string
  employerName: string
  employmentRecordId: string
  userId: string
  existing: ReviewRow | null
  recordSummary: string
  recordStatus: 'current' | 'former'
  availability: Partial<Record<keyof PrivacyFlags, boolean>>
  onSaved: () => void
}

function ReviewForm({
  employerId,
  employerName,
  employmentRecordId,
  userId,
  existing,
  recordSummary,
  recordStatus,
  availability,
  onSaved,
}: ReviewFormProps) {
  const createReview = useCreateReview()
  const updateReview = useUpdateReview()
  const isEditing = existing !== null

  const [overall, setOverall] = useState<number | null>(existing?.overall_rating ?? null)
  const [categories, setCategories] = useState<CategoryValues>(() =>
    existing
      ? {
          rating_pay: existing.rating_pay,
          rating_communication: existing.rating_communication,
          rating_job_stability: existing.rating_job_stability,
          rating_project_quality: existing.rating_project_quality,
          rating_visa_support: existing.rating_visa_support,
          rating_transparency: existing.rating_transparency,
          rating_management: existing.rating_management,
        }
      : EMPTY_CATEGORIES,
  )
  const [title, setTitle] = useState(existing?.title ?? '')
  const [body, setBody] = useState(existing?.body ?? '')
  const [pros, setPros] = useState(existing?.pros ?? '')
  const [cons, setCons] = useState(existing?.cons ?? '')
  const [privacy, setPrivacy] = useState<PrivacyFlags>(() =>
    existing
      ? {
          show_name: existing.show_name,
          show_employment_duration: existing.show_employment_duration,
          show_job_title: existing.show_job_title,
          show_project_client: existing.show_project_client,
          show_employment_location: existing.show_employment_location,
          show_linkedin: existing.show_linkedin,
        }
      : { ...DEFAULT_PRIVACY_FLAGS },
  )
  // Acknowledgement is re-required on every save, including edits: the
  // notice describes the content being submitted now, not last time.
  const [acknowledged, setAcknowledged] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const mutation = isEditing ? updateReview : createReview
  const bodyLength = body.trim().length

  const draft = useMemo(
    () => ({
      overall_rating: overall ?? 0,
      title,
      body,
      pros,
      cons,
      ...Object.fromEntries(
        RATING_CATEGORIES.map((c) => [c.key, categories[c.key] ?? 0]),
      ),
      ...privacy,
      acknowledged,
    }),
    [overall, title, body, pros, cons, categories, privacy, acknowledged],
  )

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    // Zod's number schema rejects 0, which is how "unrated" is encoded
    // above — so an unrated star input surfaces as "Select a rating".
    const result = reviewSchema.safeParse(draft)
    if (!result.success) {
      const next = fieldErrors(result.error)
      setErrors(next)
      const firstKey = Object.keys(next)[0]
      if (firstKey) {
        const target =
          document.getElementById(`review-${firstKey}`) ??
          document.querySelector<HTMLElement>(`[data-field="${firstKey}"] [role="radio"]`)
        target?.focus()
        target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
      return
    }
    setErrors({})

    // Fields the user has no data for cannot be published, whatever the
    // switch state says.
    const input: ReviewInput = {
      ...result.data,
      show_name: result.data.show_name && (availability.show_name ?? true),
      show_linkedin: result.data.show_linkedin && (availability.show_linkedin ?? true),
      show_project_client:
        result.data.show_project_client && (availability.show_project_client ?? true),
      show_employment_location:
        result.data.show_employment_location && (availability.show_employment_location ?? true),
    }

    const onSuccess = () => {
      setSaved(true)
      window.setTimeout(onSaved, 900)
    }

    if (isEditing && existing) {
      updateReview.mutate({ reviewId: existing.id, employerId, input }, { onSuccess })
    } else {
      createReview.mutate({ userId, employerId, employmentRecordId, input }, { onSuccess })
    }
  }

  if (saved) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 lg:px-8" role="status">
        <CheckCircle2 className="mx-auto size-10 text-positive" aria-hidden="true" />
        <h1 className="mt-4 font-serif text-2xl text-ink">
          {isEditing ? 'Your review has been updated' : 'Your review is live'}
        </h1>
        <p className="mt-2 text-ink-muted">Taking you to {employerName}…</p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8"
    >
      <BackLink employerId={employerId} name={employerName} />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="display-lg text-ink">
            {isEditing ? 'Edit your review' : 'Review'} {isEditing ? '' : employerName}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            <Badge variant={recordStatus === 'current' ? 'brand' : 'neutral'} className="mr-2">
              {recordStatus === 'current' ? 'Current employee' : 'Former employee'}
            </Badge>
            {recordSummary}
            {' · '}
            <Link to="/account/employment" className="text-brand hover:underline">
              Edit employment record
            </Link>
          </p>
        </div>
        {isEditing && <Badge variant="neutral">Editing</Badge>}
      </div>

      <div className="mt-10 space-y-10">
        {/* ---- Overall ------------------------------------------------ */}
        <section data-field="overall_rating" aria-labelledby="overall-heading">
          <h2 id="overall-heading" className="eyebrow">
            Overall
          </h2>
          <div className="mt-3 rounded-lg border border-line bg-canvas p-4 shadow-card">
            <RatingInput
              label="How would you rate this employer overall?"
              description="This is the rating used in rankings. The categories below add detail."
              value={overall}
              onChange={setOverall}
              size="lg"
              error={errors['overall_rating']}
            />
          </div>
        </section>

        {/* ---- Categories --------------------------------------------- */}
        <section aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="eyebrow">
            Category ratings
          </h2>
          <p className="mt-1 text-sm text-ink-muted">All seven are required.</p>
          <div className="mt-3 divide-y divide-line rounded-lg border border-line bg-canvas px-4 shadow-card">
            {RATING_CATEGORIES.map((category) => (
              <div key={category.key} data-field={category.key} className="py-3">
                <RatingInput
                  label={category.label}
                  description={category.help}
                  value={categories[category.key]}
                  onChange={(value) =>
                    setCategories((prev) => ({ ...prev, [category.key]: value }))
                  }
                  layout="row"
                  error={errors[category.key]}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ---- Written review ----------------------------------------- */}
        <section aria-labelledby="written-heading" className="space-y-5">
          <h2 id="written-heading" className="eyebrow">
            Your experience
          </h2>

          <Field>
            <FieldLabel htmlFor="review-title">Title</FieldLabel>
            <Input
              id="review-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sum it up in a sentence"
              maxLength={140}
              aria-invalid={Boolean(errors['title'])}
              required
            />
            <FieldError>{errors['title']}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="review-body">Review</FieldLabel>
            <Textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What was it actually like to work here? Pay, bench time, how the visa process was handled, how management treated you…"
              className="min-h-[180px]"
              maxLength={8000}
              aria-invalid={Boolean(errors['body'])}
              aria-describedby="review-body-count"
              required
            />
            <div className="flex justify-between gap-4">
              <FieldDescription>
                Specific and factual beats general. Describe what happened to you.
              </FieldDescription>
              <span
                id="review-body-count"
                className={bodyLength < 50 ? 'text-xs text-ink-subtle' : 'text-xs text-positive'}
                data-numeric
              >
                {bodyLength < 50 ? `${50 - bodyLength} more characters needed` : `${bodyLength.toLocaleString()} characters`}
              </span>
            </div>
            <FieldError>{errors['body']}</FieldError>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="review-pros">
                Pros <span className="font-normal text-ink-subtle">(optional)</span>
              </FieldLabel>
              <Textarea
                id="review-pros"
                value={pros}
                onChange={(e) => setPros(e.target.value)}
                className="min-h-[100px]"
                maxLength={2000}
                aria-invalid={Boolean(errors['pros'])}
              />
              <FieldError>{errors['pros']}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="review-cons">
                Cons <span className="font-normal text-ink-subtle">(optional)</span>
              </FieldLabel>
              <Textarea
                id="review-cons"
                value={cons}
                onChange={(e) => setCons(e.target.value)}
                className="min-h-[100px]"
                maxLength={2000}
                aria-invalid={Boolean(errors['cons'])}
              />
              <FieldError>{errors['cons']}</FieldError>
            </Field>
          </div>
        </section>

        {/* ---- Privacy ------------------------------------------------ */}
        <section aria-labelledby="privacy-heading">
          <h2 id="privacy-heading" className="eyebrow">
            What readers can see about you
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Everything starts hidden. Turn on only what you are comfortable publishing.
          </p>
          <PrivacyControls
            className="mt-3"
            value={privacy}
            onChange={setPrivacy}
            availability={availability}
          />
        </section>

        {/* ---- Safety notice + acknowledgement ------------------------ */}
        <section aria-labelledby="notice-heading">
          <Card className="border-caution/40">
            <CardHeader>
              <CardTitle id="notice-heading" className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-5 text-caution" aria-hidden="true" />
                Before you submit
              </CardTitle>
              <CardDescription className="text-ink">{REVIEW_SAFETY_NOTICE}</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  id="review-acknowledged"
                  type="checkbox"
                  className="mt-1 size-4 accent-brand"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  aria-invalid={Boolean(errors['acknowledged'])}
                  aria-describedby={errors['acknowledged'] ? 'review-acknowledged-error' : undefined}
                  required
                />
                <span className="text-sm text-ink">
                  I confirm this review reflects my own personal employment experience and
                  follows the{' '}
                  <Link to="/guidelines" className="text-brand hover:underline" target="_blank">
                    review guidelines
                  </Link>
                  .
                </span>
              </label>
              {errors['acknowledged'] && (
                <p id="review-acknowledged-error" role="alert" className="mt-2 text-sm text-critical">
                  {errors['acknowledged']}
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {mutation.isError && (
          <p role="alert" className="rounded-md bg-critical-subtle px-3 py-2 text-sm text-critical">
            {toUserMessage(mutation.error)}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" loading={mutation.isPending}>
            {isEditing ? 'Save changes' : 'Publish review'}
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link to={`/employers/${employerId}`}>Cancel</Link>
          </Button>
        </div>
      </div>
    </form>
  )
}
