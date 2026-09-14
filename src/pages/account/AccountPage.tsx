import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useUpdateProfile } from '@/hooks/useEmployment'
import { profileSchema, fieldErrors, type ProfileInput } from '@/lib/validation'
import { toUserMessage } from '@/lib/errors'
import { PRIVACY_FIELDS } from '@/lib/constants'
import { Field, FieldDescription, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PageSpinner } from '@/components/States'
import type { User } from '@supabase/supabase-js'
import type { ProfileRow } from '@/lib/database.types'

// ── Inner component — receives non-nullable user/profile ──────────────────────

interface AccountFormProps {
  user: User
  profile: ProfileRow | null
  isSuspended: boolean
}

function AccountForm({ user, profile, isSuspended }: AccountFormProps) {
  const updateProfile = useUpdateProfile()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedin_url ?? '')
  const [country, setCountry] = useState(profile?.country ?? '')
  const [state, setState] = useState(profile?.state ?? '')
  const [city, setCity] = useState(profile?.city ?? '')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaved(false)
    setServerError(null)

    const raw = {
      display_name: displayName,
      full_name: fullName || undefined,
      phone: phone || undefined,
      linkedin_url: linkedinUrl || undefined,
      country: country || undefined,
      state: state || undefined,
      city: city || undefined,
    }

    const result = profileSchema.safeParse(raw)
    if (!result.success) {
      const errs = fieldErrors(result.error)
      setErrors(errs)
      const firstKey = Object.keys(errs)[0]
      if (firstKey) {
        const el = document.getElementById(`profile-${firstKey}`)
        if (el) (el as HTMLElement).focus()
      }
      return
    }
    setErrors({})

    const input: ProfileInput = result.data
    updateProfile.mutate(
      { userId: user.id, input },
      {
        onSuccess: () => {
          setSaved(true)
          setServerError(null)
        },
        onError: (err) => {
          setServerError(toUserMessage(err))
          setSaved(false)
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Suspension banner */}
      {isSuspended && (
        <div
          role="alert"
          className="mb-8 flex gap-3 rounded-lg border border-critical/30 bg-critical-subtle px-4 py-4"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-critical" aria-hidden="true" />
          <div>
            <p className="font-medium text-critical">Your account is suspended</p>
            <p className="mt-1 text-sm text-ink-muted">
              You cannot post or edit reviews while suspended.
              {profile?.suspension_reason ? (
                <> Reason: {profile.suspension_reason}</>
              ) : null}
            </p>
          </div>
        </div>
      )}

      <h1 className="display-lg">Account</h1>
      <p className="mt-2 text-ink-muted">Manage your profile and privacy settings.</p>

      {/* ── Profile form ────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">Profile</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Basic information about you. This is not your public identity — your reviews are
          anonymous by default.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          {/* Email — read-only */}
          <Field>
            <label
              htmlFor="profile-email"
              className="text-sm font-medium text-ink"
            >
              Email address
            </label>
            <Input
              id="profile-email"
              type="email"
              value={user.email ?? ''}
              readOnly
              disabled
              className="bg-canvas-sunken"
            />
            <FieldDescription>
              Your email is never shown publicly and cannot be changed here.
            </FieldDescription>
          </Field>

          {/* Display name */}
          <Field>
            <label htmlFor="profile-display_name" className="text-sm font-medium text-ink">
              Display name{' '}
              <span className="font-normal text-ink-subtle">(required)</span>
            </label>
            <Input
              id="profile-display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Raju B."
              aria-invalid={Boolean(errors['display_name'])}
              maxLength={80}
              required
            />
            <FieldDescription>
              Shown only on reviews where you have opted to publish your name.
            </FieldDescription>
            <FieldError>{errors['display_name']}</FieldError>
          </Field>

          {/* Full name */}
          <Field>
            <label htmlFor="profile-full_name" className="text-sm font-medium text-ink">
              Full name{' '}
              <span className="font-normal text-ink-subtle">(optional)</span>
            </label>
            <Input
              id="profile-full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Rajesh Bhatia"
              aria-invalid={Boolean(errors['full_name'])}
              maxLength={120}
            />
            <FieldError>{errors['full_name']}</FieldError>
          </Field>

          {/* Phone — explicitly private */}
          <Field>
            <label htmlFor="profile-phone" className="text-sm font-medium text-ink">
              Phone{' '}
              <span className="font-normal text-ink-subtle">(optional)</span>
            </label>
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 1234"
              aria-invalid={Boolean(errors['phone'])}
              maxLength={40}
            />
            <FieldDescription>
              Stored privately on your account. This field can never be published or seen
              by other users.
            </FieldDescription>
            <FieldError>{errors['phone']}</FieldError>
          </Field>

          {/* LinkedIn */}
          <Field>
            <label htmlFor="profile-linkedin_url" className="text-sm font-medium text-ink">
              LinkedIn URL{' '}
              <span className="font-normal text-ink-subtle">(optional)</span>
            </label>
            <Input
              id="profile-linkedin_url"
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://www.linkedin.com/in/yourprofile"
              aria-invalid={Boolean(errors['linkedin_url'])}
            />
            <FieldDescription>
              Shown only on reviews where you enable the LinkedIn visibility option.
            </FieldDescription>
            <FieldError>{errors['linkedin_url']}</FieldError>
          </Field>

          {/* Location */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-medium text-ink">
              Location{' '}
              <span className="font-normal text-ink-subtle">(optional)</span>
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field>
                <label htmlFor="profile-city" className="text-sm font-medium text-ink">
                  City
                </label>
                <Input
                  id="profile-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Edison"
                  aria-invalid={Boolean(errors['city'])}
                  maxLength={80}
                />
                <FieldError>{errors['city']}</FieldError>
              </Field>
              <Field>
                <label htmlFor="profile-state" className="text-sm font-medium text-ink">
                  State
                </label>
                <Input
                  id="profile-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="NJ"
                  aria-invalid={Boolean(errors['state'])}
                  maxLength={80}
                />
                <FieldError>{errors['state']}</FieldError>
              </Field>
              <Field>
                <label htmlFor="profile-country" className="text-sm font-medium text-ink">
                  Country
                </label>
                <Input
                  id="profile-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="United States"
                  aria-invalid={Boolean(errors['country'])}
                  maxLength={80}
                />
                <FieldError>{errors['country']}</FieldError>
              </Field>
            </div>
          </fieldset>

          {/* Server error */}
          {serverError && (
            <p
              role="alert"
              className="rounded-md bg-critical-subtle px-3 py-2 text-sm text-critical"
            >
              {serverError}
            </p>
          )}

          {/* Success confirmation */}
          {saved && (
            <p
              role="status"
              className="rounded-md bg-positive-subtle px-3 py-2 text-sm text-positive"
            >
              Profile saved successfully.
            </p>
          )}

          <Button
            type="submit"
            loading={updateProfile.isPending}
            disabled={updateProfile.isPending}
          >
            Save profile
          </Button>
        </form>
      </section>

      {/* ── Privacy explanation ──────────────────────────────────────── */}
      <section className="mt-12">
        <div className="rounded-xl border border-privacy-line bg-privacy-subtle p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck
              className="mt-0.5 size-5 shrink-0 text-privacy"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-ink">How your privacy works</h2>

              <p className="mt-2 text-sm text-ink-muted">
                <strong className="font-medium text-ink">
                  Reviews are anonymous by default.
                </strong>{' '}
                Your identity is never attached to a review unless you explicitly opt in.
              </p>

              <p className="mt-3 text-sm font-medium text-ink">
                On each review you can optionally reveal:
              </p>
              <ul className="mt-2 space-y-1.5">
                {PRIVACY_FIELDS.map((field) => (
                  <li key={field.key} className="flex gap-2 text-sm text-ink-muted">
                    <span
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-privacy"
                      aria-hidden="true"
                    />
                    <span>
                      <span className="font-medium text-ink">{field.label}</span> —{' '}
                      {field.description}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-md border border-privacy-line bg-canvas px-3 py-3 text-sm text-ink-muted">
                <strong className="font-medium text-ink">
                  Email and phone are never publishable.
                </strong>{' '}
                These fields do not appear in any review or public profile, regardless of
                your settings. They exist solely for account management.
              </div>

              <p className="mt-4 text-sm text-ink-muted">
                Privacy is chosen individually per review — there is no global toggle
                here. To change what a specific review reveals,{' '}
                <Link
                  to="/account/reviews"
                  className="font-medium text-privacy underline-offset-4 hover:underline"
                >
                  go to My Reviews
                </Link>{' '}
                and edit that review.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

// ── Public export ─────────────────────────────────────────────────────────────

export function AccountPage() {
  const { user, profile, isSuspended } = useAuth()

  if (!user) return <PageSpinner />

  return <AccountForm user={user} profile={profile} isSuspended={isSuspended} />
}
