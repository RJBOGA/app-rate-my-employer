import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { EmployerCombobox } from '@/components/EmployerCombobox'
import { CreateEmployerDialog } from '@/components/CreateEmployerDialog'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

/**
 * Step one of writing a review: identify the employer.
 *
 * Deliberately a separate step. Making the user resolve the employer
 * first — against a live list with review counts — is the main defence
 * against duplicate entries, far more effective than any check applied
 * after they have already typed out a full review.
 */
export function WriteReviewStartPage() {
  const navigate = useNavigate()
  const { isSuspended, profile } = useAuth()
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingName, setPendingName] = useState('')

  if (isSuspended) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div
          role="alert"
          className="rounded-lg border border-critical/30 bg-critical-subtle p-6"
        >
          <h1 className="font-serif text-xl text-ink">Your account is suspended</h1>
          <p className="mt-2 text-ink-muted">
            Suspended accounts cannot post reviews or employment records. Your existing
            content has not been deleted.
          </p>
          {profile?.suspension_reason && (
            <p className="mt-3 text-sm text-ink-muted">
              <span className="font-medium text-ink">Reason given:</span>{' '}
              {profile.suspension_reason}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="display-lg text-ink">Write a review</h1>
      <p className="mt-2 text-ink-muted">
        Start by finding your employer. If several entries look similar, pick the one
        other people are already reviewing.
      </p>

      <Card className="mt-8">
        <CardContent className="pt-6">
          <EmployerCombobox
            label="Which employer are you reviewing?"
            hideLabel={false}
            autoFocus
            placeholder="Start typing the employer’s name…"
            onSelect={(employer) => navigate(`/employers/${employer.id}/review`)}
            onCreate={(name) => {
              setPendingName(name)
              setCreateOpen(true)
            }}
          />

          <p className="mt-4 text-sm text-ink-muted">
            Can’t find them? Type the full name and choose{' '}
            <span className="font-medium text-ink">Create</span> at the bottom of the
            list. We’ll check for near-matches before adding anything.
          </p>
        </CardContent>
      </Card>

      <div className="mt-8 rounded-lg border border-privacy-line bg-privacy-subtle p-4">
        <p className="flex items-start gap-2 font-medium text-ink">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-privacy" aria-hidden="true" />
          Your review is anonymous unless you say otherwise
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Every identifying detail starts hidden. Before you submit, you choose field by
          field what to show — your name, tenure, job title, project, location, LinkedIn.
          Your email and phone number can never be published.
        </p>
        <Link to="/guidelines" className="mt-3 inline-block text-sm text-brand hover:underline">
          Read the review guidelines
        </Link>
      </div>

      <CreateEmployerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialName={pendingName}
        onCreated={(employerId) => {
          setCreateOpen(false)
          navigate(`/employers/${employerId}/review`)
        }}
      />
    </div>
  )
}
