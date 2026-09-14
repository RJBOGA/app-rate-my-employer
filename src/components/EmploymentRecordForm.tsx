import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { MONTHS } from '@/lib/constants'
import { employmentRecordSchema, fieldErrors, type EmploymentRecordInput } from '@/lib/validation'
import type { EmploymentRecordRow, EmploymentStatus } from '@/lib/database.types'
import { cn } from '@/lib/utils'

interface EmploymentRecordFormProps {
  employerId: string
  employerName: string
  existing?: EmploymentRecordRow | null
  onSubmit: (input: EmploymentRecordInput) => void | Promise<void>
  submitting?: boolean
  submitLabel?: string
  serverError?: string | null
  onCancel?: () => void
  className?: string
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1950 + 1 }, (_, i) => CURRENT_YEAR - i)

/**
 * Employment record form.
 *
 * Verification is explicitly out of scope for V1 — the user's account of
 * their own employment is taken at face value. What this form does
 * enforce is internal coherence (a former employee has an end date, the
 * end is not before the start, neither is in the future), which is also
 * enforced by CHECK constraints and a trigger in the database.
 */
export function EmploymentRecordForm({
  employerId,
  employerName,
  existing,
  onSubmit,
  submitting,
  submitLabel = 'Save employment record',
  serverError,
  onCancel,
  className,
}: EmploymentRecordFormProps) {
  const [status, setStatus] = useState<EmploymentStatus>(existing?.status ?? 'current')
  const [startMonth, setStartMonth] = useState<number | null>(existing?.start_month ?? null)
  const [startYear, setStartYear] = useState<number | null>(existing?.start_year ?? null)
  const [endMonth, setEndMonth] = useState<number | null>(existing?.end_month ?? null)
  const [endYear, setEndYear] = useState<number | null>(existing?.end_year ?? null)
  const [jobTitle, setJobTitle] = useState(existing?.job_title ?? '')
  const [projectClient, setProjectClient] = useState(existing?.project_client ?? '')
  const [location, setLocation] = useState(existing?.location ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isFormer = status === 'former'

  const draft = useMemo(
    () => ({
      employer_id: employerId,
      status,
      start_month: startMonth ?? 0,
      start_year: startYear ?? 0,
      end_month: isFormer ? endMonth : null,
      end_year: isFormer ? endYear : null,
      job_title: jobTitle,
      project_client: projectClient,
      location,
    }),
    [
      employerId,
      status,
      startMonth,
      startYear,
      endMonth,
      endYear,
      isFormer,
      jobTitle,
      projectClient,
      location,
    ],
  )

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const result = employmentRecordSchema.safeParse(draft)
    if (!result.success) {
      setErrors(fieldErrors(result.error))
      // Move focus to the first problem so keyboard users are not left
      // guessing which of eight fields failed.
      const firstKey = Object.keys(fieldErrors(result.error))[0]
      if (firstKey) {
        document.getElementById(`employment-${firstKey}`)?.focus()
      }
      return
    }
    setErrors({})
    void onSubmit(result.data)
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-5', className)} noValidate>
      <div>
        <p className="eyebrow">Employment record</p>
        <p className="mt-1 text-sm text-ink-muted">
          Your role at <span className="font-medium text-ink">{employerName}</span>. This
          is private by default — only the details you choose to publish on a review are
          ever shown.
        </p>
      </div>

      <Field>
        <FieldLabel>Employment status</FieldLabel>
        <RadioGroup
          value={status}
          onValueChange={(next) => setStatus(next as EmploymentStatus)}
          className="flex flex-col gap-2 sm:flex-row sm:gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="current" id="employment-status-current" />
            <label htmlFor="employment-status-current" className="text-sm text-ink">
              Current employee
            </label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="former" id="employment-status-former" />
            <label htmlFor="employment-status-former" className="text-sm text-ink">
              Former employee
            </label>
          </div>
        </RadioGroup>
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">Start date</legend>
        <div className="grid grid-cols-2 gap-3">
          <Select
            value={startMonth ? String(startMonth) : undefined}
            onValueChange={(v) => setStartMonth(Number(v))}
          >
            <SelectTrigger id="employment-start_month" aria-label="Start month">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month, index) => (
                <SelectItem key={month} value={String(index + 1)}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={startYear ? String(startYear) : undefined}
            onValueChange={(v) => setStartYear(Number(v))}
          >
            <SelectTrigger id="employment-start_year" aria-label="Start year">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <FieldError>{errors['start_month'] ?? errors['start_year']}</FieldError>
      </fieldset>

      {isFormer && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">End date</legend>
          <div className="grid grid-cols-2 gap-3">
            <Select
              value={endMonth ? String(endMonth) : undefined}
              onValueChange={(v) => setEndMonth(Number(v))}
            >
              <SelectTrigger id="employment-end_month" aria-label="End month">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, index) => (
                  <SelectItem key={month} value={String(index + 1)}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={endYear ? String(endYear) : undefined}
              onValueChange={(v) => setEndYear(Number(v))}
            >
              <SelectTrigger id="employment-end_year" aria-label="End year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FieldError>{errors['end_month'] ?? errors['end_year']}</FieldError>
        </fieldset>
      )}

      <Field>
        <FieldLabel htmlFor="employment-job_title">Job title</FieldLabel>
        <Input
          id="employment-job_title"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="Software Engineer"
          aria-invalid={Boolean(errors['job_title'])}
          maxLength={120}
          required
        />
        <FieldError>{errors['job_title']}</FieldError>
      </Field>

      <Field>
        <FieldLabel htmlFor="employment-project_client">
          Project or client <span className="font-normal text-ink-subtle">(optional)</span>
        </FieldLabel>
        <Input
          id="employment-project_client"
          value={projectClient}
          onChange={(e) => setProjectClient(e.target.value)}
          placeholder="Retail banking migration"
          aria-invalid={Boolean(errors['project_client'])}
          maxLength={120}
        />
        <FieldDescription>
          Hidden unless you choose to publish it. Avoid naming individuals.
        </FieldDescription>
        <FieldError>{errors['project_client']}</FieldError>
      </Field>

      <Field>
        <FieldLabel htmlFor="employment-location">
          Work location <span className="font-normal text-ink-subtle">(optional)</span>
        </FieldLabel>
        <Input
          id="employment-location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Edison, NJ"
          aria-invalid={Boolean(errors['location'])}
          maxLength={120}
        />
        <FieldError>{errors['location']}</FieldError>
      </Field>

      {serverError && (
        <p role="alert" className="rounded-md bg-critical-subtle px-3 py-2 text-sm text-critical">
          {serverError}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
