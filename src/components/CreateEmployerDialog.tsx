import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RatingValue } from '@/components/RatingStars'
import { useCreateEmployer, type CreateEmployerResult } from '@/hooks/useEmployers'
import { employerSchema, fieldErrors } from '@/lib/validation'
import { formatLocation, formatReviewCount } from '@/lib/format'
import { toUserMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

interface CreateEmployerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fills the name from whatever the user typed into the combobox. */
  initialName?: string
  onCreated: (employerId: string) => void
}

/**
 * Creating an employer, with the duplicate check the user actually sees.
 *
 * Three server outcomes are handled distinctly:
 *
 *   duplicate            — an exact normalized-name (or alias) collision.
 *                          Hard stop; we send the user to the existing
 *                          employer. There is no "create anyway".
 *   needs_confirmation   — close-but-not-identical names exist. We show
 *                          them and make the user look before proceeding.
 *   created              — done.
 *
 * The client cannot skip any of this: `employers` has no INSERT policy,
 * so this RPC is the only way a row can be created.
 */
export function CreateEmployerDialog({
  open,
  onOpenChange,
  initialName = '',
  onCreated,
}: CreateEmployerDialogProps) {
  const createMutation = useCreateEmployer()

  const [name, setName] = useState(initialName)
  const [country, setCountry] = useState('')
  const [state, setState] = useState('')
  const [city, setCity] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [result, setResult] = useState<CreateEmployerResult | null>(null)

  useEffect(() => {
    if (open) {
      setName(initialName)
      setResult(null)
      setErrors({})
      createMutation.reset()
    }
    // Reset only on open; mutation identity is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialName])

  function submit(confirmSimilar: boolean) {
    const parsed = employerSchema.safeParse({
      canonical_name: name,
      country,
      state,
      city,
      website,
      description,
    })

    if (!parsed.success) {
      const next = fieldErrors(parsed.error)
      setErrors(next)
      const firstKey = Object.keys(next)[0]
      if (firstKey) document.getElementById(`employer-${firstKey}`)?.focus()
      return
    }
    setErrors({})

    createMutation.mutate(
      { ...parsed.data, confirmSimilar },
      {
        onSuccess: (outcome) => {
          setResult(outcome)
          if (outcome.status === 'created') {
            onCreated(outcome.employer.id)
          }
        },
      },
    )
  }

  // ---- Outcome: exact duplicate -------------------------------------
  if (result?.status === 'duplicate') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>This employer already exists</DialogTitle>
            <DialogDescription>
              {result.matched_on === 'alias'
                ? 'That name is already recorded as an alternative name for an existing employer.'
                : 'An employer with this name is already in the directory.'}{' '}
              Adding your review there keeps everyone’s experience in one place.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-line bg-canvas-subtle p-4">
            <p className="font-serif text-lg text-ink">{result.employer.canonical_name}</p>
            <p className="mt-0.5 text-sm text-ink-muted">
              {formatLocation({
                city: result.employer.city,
                state: result.employer.state,
                country: result.employer.country,
              })}
            </p>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => onCreated(result.employer.id)}>
              Continue to this employer
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // ---- Outcome: near-duplicates found -------------------------------
  if (result?.status === 'needs_confirmation') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Is it one of these?</DialogTitle>
            <DialogDescription>
              We found employers with similar names. Picking the right existing one keeps
              reviews together instead of splitting them across near-identical entries.
            </DialogDescription>
          </DialogHeader>

          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {result.candidates.map((candidate) => (
              <li key={candidate.id}>
                <button
                  type="button"
                  onClick={() => onCreated(candidate.id)}
                  className={cn(
                    'flex w-full items-start justify-between gap-4 rounded-lg border border-line',
                    'bg-canvas p-3 text-left hover:border-brand-line hover:bg-brand-subtle',
                    'transition-colors duration-150',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">
                      {candidate.canonical_name}
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-muted" data-numeric>
                      {formatReviewCount(candidate.review_count)}
                      {formatLocation({
                        city: candidate.city,
                        state: candidate.state,
                        country: candidate.country,
                      })
                        ? ` · ${formatLocation({
                            city: candidate.city,
                            state: candidate.state,
                            country: candidate.country,
                          })}`
                        : ''}
                    </span>
                  </span>
                  <RatingValue value={candidate.avg_rating} className="shrink-0" />
                </button>
              </li>
            ))}
          </ul>

          <p className="flex items-start gap-2 rounded-md bg-caution-subtle px-3 py-2 text-sm text-caution">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Only create a new entry if none of the above is your employer — for example
              a genuinely separate legal entity in a different country.
            </span>
          </p>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setResult(null)}>
              Back
            </Button>
            <Button
              variant="secondary"
              loading={createMutation.isPending}
              onClick={() => submit(true)}
            >
              None of these — create “{name.trim()}”
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // ---- Form ----------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit(false)
          }}
          noValidate
        >
          <DialogHeader>
            <DialogTitle>Add an employer</DialogTitle>
            <DialogDescription>
              Use the employer’s full legal or commonly used name. We will check for
              existing entries before creating anything.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto py-4">
            <Field>
              <FieldLabel htmlFor="employer-canonical_name">Employer name</FieldLabel>
              <Input
                id="employer-canonical_name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Tata Consultancy Services"
                aria-invalid={Boolean(errors['canonical_name'])}
                maxLength={160}
                required
                autoFocus
              />
              <FieldDescription>
                Keep suffixes like “LLC” or “Pvt Ltd” if they are part of the name —
                separate legal entities are tracked separately.
              </FieldDescription>
              <FieldError>{errors['canonical_name']}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="employer-country">Country</FieldLabel>
              <Input
                id="employer-country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                placeholder="United States"
                aria-invalid={Boolean(errors['country'])}
                maxLength={80}
                required
              />
              <FieldError>{errors['country']}</FieldError>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="employer-state">
                  State <span className="font-normal text-ink-subtle">(optional)</span>
                </FieldLabel>
                <Input
                  id="employer-state"
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  maxLength={80}
                />
                <FieldError>{errors['state']}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="employer-city">
                  City <span className="font-normal text-ink-subtle">(optional)</span>
                </FieldLabel>
                <Input
                  id="employer-city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  maxLength={80}
                />
                <FieldError>{errors['city']}</FieldError>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="employer-website">
                Website <span className="font-normal text-ink-subtle">(optional)</span>
              </FieldLabel>
              <Input
                id="employer-website"
                type="url"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="https://example.com"
                aria-invalid={Boolean(errors['website'])}
              />
              <FieldError>{errors['website']}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="employer-description">
                Description <span className="font-normal text-ink-subtle">(optional)</span>
              </FieldLabel>
              <Textarea
                id="employer-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2000}
                className="min-h-[80px]"
                placeholder="What the company does, in a sentence or two."
              />
              <FieldError>{errors['description']}</FieldError>
            </Field>

            {createMutation.isError && (
              <p
                role="alert"
                className="rounded-md bg-critical-subtle px-3 py-2 text-sm text-critical"
              >
                {toUserMessage(createMutation.error)}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Check and continue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
