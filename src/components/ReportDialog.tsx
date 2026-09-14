import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { REPORT_REASONS, REPORT_TARGET_LABEL } from '@/lib/constants'
import { reportSchema, fieldErrors, type ReportInput } from '@/lib/validation'
import { useReportContent } from '@/hooks/useReports'
import { useAuth } from '@/hooks/useAuth'
import { toUserMessage } from '@/lib/errors'
import type { ReportTargetType } from '@/lib/database.types'

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetType: ReportTargetType
  targetId: string | null
}

/**
 * Report flow.
 *
 * The copy is deliberate about what reporting does and does not do:
 * nothing is removed automatically. Telling the reporter that up front
 * avoids both the expectation that content vanishes on submit and the
 * incentive to mass-report in the hope that volume triggers deletion.
 */
export function ReportDialog({ open, onOpenChange, targetType, targetId }: ReportDialogProps) {
  const { user } = useAuth()
  const reportMutation = useReportContent()

  const [reason, setReason] = useState<ReportInput['reason'] | null>(null)
  const [details, setDetails] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!open) {
      setReason(null)
      setDetails('')
      setErrors({})
      setSubmitted(false)
      reportMutation.reset()
    }
    // reportMutation identity is stable enough for this reset-on-close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!targetId) return

    const result = reportSchema.safeParse({ reason, details })
    if (!result.success) {
      setErrors(fieldErrors(result.error))
      return
    }
    setErrors({})

    reportMutation.mutate(
      { targetType, targetId, input: result.data },
      { onSuccess: () => setSubmitted(true) },
    )
  }

  const label = REPORT_TARGET_LABEL[targetType]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {!user ? (
          <>
            <DialogHeader>
              <DialogTitle>Sign in to report</DialogTitle>
              <DialogDescription>
                Reporting requires an account. This is only to prevent abuse of the
                reporting system — your identity is never shown to the person you report.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button asChild>
                <Link to="/sign-in">Sign in</Link>
              </Button>
            </DialogFooter>
          </>
        ) : submitted ? (
          <>
            <DialogHeader>
              <DialogTitle>Report received</DialogTitle>
              <DialogDescription>
                A moderator will review this {label}. Reported content stays visible until
                a moderator makes a decision — we do not remove anything automatically.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <DialogHeader>
              <DialogTitle>Report this {label}</DialogTitle>
              <DialogDescription>
                Tell us what is wrong with it. A moderator reviews every report — nothing
                is hidden or deleted automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              <Field>
                <FieldLabel>Reason</FieldLabel>
                <RadioGroup
                  value={reason ?? undefined}
                  onValueChange={(v) => setReason(v as ReportInput['reason'])}
                  className="space-y-2"
                  aria-invalid={Boolean(errors['reason'])}
                >
                  {REPORT_REASONS.map((option) => (
                    <div key={option.value} className="flex items-start gap-2">
                      <RadioGroupItem
                        value={option.value}
                        id={`report-reason-${option.value}`}
                        className="mt-0.5"
                      />
                      <label
                        htmlFor={`report-reason-${option.value}`}
                        className="text-sm text-ink"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </RadioGroup>
                <FieldError>{errors['reason']}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="report-details">
                  Anything else{' '}
                  <span className="font-normal text-ink-subtle">(optional)</span>
                </FieldLabel>
                <Textarea
                  id="report-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={2000}
                  placeholder="What should the moderator know?"
                  className="min-h-[90px]"
                />
                <FieldDescription>
                  Please do not include personal information about anyone in this box.
                </FieldDescription>
                <FieldError>{errors['details']}</FieldError>
              </Field>

              {reportMutation.isError && (
                <p
                  role="alert"
                  className="rounded-md bg-critical-subtle px-3 py-2 text-sm text-critical"
                >
                  {toUserMessage(reportMutation.error)}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={reportMutation.isPending}>
                Submit report
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
