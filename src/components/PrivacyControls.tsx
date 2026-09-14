import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PRIVACY_FIELDS, type PrivacyFieldKey } from '@/lib/constants'

export type PrivacyFlags = Record<PrivacyFieldKey, boolean>

interface PrivacyControlsProps {
  value: PrivacyFlags
  onChange: (next: PrivacyFlags) => void
  /** Fields with no data to publish are disabled with an explanation. */
  availability?: Partial<Record<PrivacyFieldKey, boolean>>
  className?: string
}

/**
 * Per-field publication controls for a review.
 *
 * Framing matters here. These are opt-INs: every switch starts off, and
 * the heading states the resulting posture rather than making the user
 * infer it from six toggle positions. A user who changes nothing is
 * fully anonymous, and the summary line says so in those words.
 *
 * Email and phone are not on this list and never will be — they are not
 * "default off", they are not publishable at all.
 */
export function PrivacyControls({
  value,
  onChange,
  availability,
  className,
}: PrivacyControlsProps) {
  const enabledCount = PRIVACY_FIELDS.filter((f) => value[f.key]).length
  const fullyAnonymous = enabledCount === 0

  return (
    <div className={cn('rounded-lg border border-line bg-canvas', className)}>
      <div
        className={cn(
          'flex items-start gap-3 rounded-t-lg border-b px-4 py-3',
          fullyAnonymous
            ? 'border-privacy-line bg-privacy-subtle'
            : 'border-line bg-canvas-subtle',
        )}
      >
        {fullyAnonymous ? (
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-privacy" aria-hidden="true" />
        ) : (
          <Eye className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <p className="font-medium text-ink">
            {fullyAnonymous
              ? 'This review will be posted anonymously'
              : `This review will show ${enabledCount} detail${enabledCount === 1 ? '' : 's'} about you`}
          </p>
          <p className="mt-0.5 text-sm text-ink-muted">
            {fullyAnonymous
              ? 'Readers will see “Anonymous” and whether you are a current or former employee. Nothing else about you is shown.'
              : 'Everything else about you stays private. You can change these at any time by editing the review.'}
          </p>
        </div>
      </div>

      <ul className="divide-y divide-line">
        {PRIVACY_FIELDS.map((field) => {
          const available = availability?.[field.key] ?? true
          const checked = value[field.key] && available

          return (
            <li key={field.key} className="flex items-start gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={`privacy-${field.key}`}
                  className="flex flex-wrap items-center gap-2 font-medium text-ink"
                >
                  {field.label}
                  {!checked && (
                    <Badge variant="privacy" className="gap-1">
                      <EyeOff className="size-3" aria-hidden="true" />
                      Hidden
                    </Badge>
                  )}
                </label>
                <p className="mt-0.5 text-sm text-ink-muted">{field.description}</p>
                {!available && (
                  <p className="mt-1 text-sm text-caution">
                    Nothing to show — add this to your profile or employment record first.
                  </p>
                )}
              </div>

              <Switch
                id={`privacy-${field.key}`}
                checked={checked}
                disabled={!available}
                onCheckedChange={(next) => onChange({ ...value, [field.key]: next })}
                aria-describedby={`privacy-${field.key}-description`}
              />
              <span id={`privacy-${field.key}-description`} className="sr-only">
                {field.description}
              </span>
            </li>
          )
        })}
      </ul>

      <p className="flex items-start gap-2 rounded-b-lg border-t border-line bg-canvas-subtle px-4 py-3 text-sm text-ink-muted">
        <Lock className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
        <span>
          Your email address and phone number are never published, and cannot be made
          public. They are not part of this list.
        </span>
      </p>
    </div>
  )
}
