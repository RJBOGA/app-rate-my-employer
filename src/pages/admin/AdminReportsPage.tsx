import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useReportQueue,
  useSetReviewStatus,
  useResolveReport,
} from '@/hooks/useAdmin'
import type { ReportWithTargets } from '@/hooks/useAdmin'
import type { ReportStatus } from '@/lib/database.types'
import { REPORT_REASONS } from '@/lib/constants'
import { toUserMessage } from '@/lib/errors'
import { formatRelativeDate, formatAbsoluteDate } from '@/lib/format'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/hooks/useAuth'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

const STATUS_TABS: Array<{ value: ReportStatus | 'all'; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'all', label: 'All' },
]

function reasonLabel(reason: string): string {
  return REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason
}

function ReviewStatusBadge({ status }: { status: string }) {
  if (status === 'published') return <Badge variant="positive">Published</Badge>
  if (status === 'hidden') return <Badge variant="caution">Hidden</Badge>
  if (status === 'removed') return <Badge variant="critical">Removed</Badge>
  return <Badge>{status}</Badge>
}

function ReportStatusBadge({ status }: { status: ReportStatus }) {
  if (status === 'open') return <Badge variant="critical">Open</Badge>
  if (status === 'under_review') return <Badge variant="caution">Under Review</Badge>
  if (status === 'resolved') return <Badge variant="positive">Resolved</Badge>
  if (status === 'dismissed') return <Badge variant="neutral">Dismissed</Badge>
  return <Badge>{status}</Badge>
}

function NoteTextarea({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  return (
    <div className="mt-2">
      <label className="mb-1 block text-xs font-medium text-ink-muted">{label}</label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Optional note (recorded in audit log)"
        className="min-h-[72px] text-sm"
      />
    </div>
  )
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-md bg-critical-subtle px-3 py-2 text-sm text-critical">
      {message}
    </p>
  )
}

function RemoveReviewDialog({
  reviewId,
  isAdmin,
}: {
  reviewId: string
  isAdmin: boolean
}) {
  const setReviewStatus = useSetReviewStatus()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleRemove() {
    setError(null)
    setReviewStatus.mutate(
      { reviewId, status: 'removed', note: note || undefined },
      { onError: (err) => setError(toUserMessage(err)) },
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <AlertDialog>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button
                variant="danger"
                size="sm"
                disabled={!isAdmin}
                aria-label="Remove review permanently"
              >
                Remove review
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          {!isAdmin && (
            <TooltipContent>Administrator privileges are required to remove reviews.</TooltipContent>
          )}
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this review?</AlertDialogTitle>
              <AlertDialogDescription>
                The review will be permanently removed from public view. This action cannot be
                undone through the UI. The review content is preserved in the audit log.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {error && <ErrorAlert message={error} />}
            <NoteTextarea value={note} onChange={setNote} label="Note (audit trail)" />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemove}
                className="bg-critical hover:bg-critical/90 text-canvas"
              >
                Remove review
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Tooltip>
    </TooltipProvider>
  )
}

function ReportCard({ report }: { report: ReportWithTargets }) {
  const { isAdmin } = useAuth()
  const setReviewStatus = useSetReviewStatus()
  const resolveReport = useResolveReport()

  const [reviewNote, setReviewNote] = useState('')
  const [reportNote, setReportNote] = useState('')
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)

  const isReviewTarget = report.target_type === 'review'
  const review = isReviewTarget ? report.reviews : null
  const employer = !isReviewTarget ? report.employers : null

  function handleReviewStatus(status: 'hidden' | 'published') {
    setReviewError(null)
    setReviewStatus.mutate(
      { reviewId: report.review_id!, status, note: reviewNote || undefined },
      { onError: (err) => setReviewError(toUserMessage(err)) },
    )
  }

  function handleReportStatus(status: ReportStatus) {
    setReportError(null)
    resolveReport.mutate(
      { reportId: report.id, status, note: reportNote || undefined },
      { onError: (err) => setReportError(toUserMessage(err)) },
    )
  }

  return (
    <div className="rounded-lg border border-line bg-canvas shadow-card">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-ink-muted eyebrow">
            {report.target_type === 'review' ? 'Review report' : 'Employer report'}
          </span>
          <ReportStatusBadge status={report.status} />
        </div>
        <time
          dateTime={report.created_at}
          className="text-xs text-ink-subtle"
          title={formatAbsoluteDate(report.created_at)}
        >
          {formatRelativeDate(report.created_at)}
        </time>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Reason + details */}
        <div>
          <p className="text-sm font-semibold text-ink">
            Reason: {reasonLabel(report.reason)}
          </p>
          {report.details && (
            <p className="mt-1 text-sm text-ink-muted">{report.details}</p>
          )}
        </div>

        {/* Target */}
        {isReviewTarget && review ? (
          <div className="rounded-md border border-line bg-canvas-subtle px-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-ink-muted">Review</span>
              <ReviewStatusBadge status={review.status} />
            </div>
            <p className="mt-1 font-medium text-ink text-sm">{review.title}</p>
            <p className="mt-0.5 text-xs text-ink-muted line-clamp-3">{review.body}</p>
            <Link
              to={`/employers/${review.employer_id}`}
              className="mt-2 block text-xs text-brand underline-offset-4 hover:underline"
            >
              View employer page
            </Link>
          </div>
        ) : employer ? (
          <div className="rounded-md border border-line bg-canvas-subtle px-3 py-3">
            <span className="text-xs font-medium text-ink-muted">Employer</span>
            <p className="mt-1 font-medium text-ink text-sm">{employer.canonical_name}</p>
            <Link
              to={`/employers/${employer.id}`}
              className="mt-1 block text-xs text-brand underline-offset-4 hover:underline"
            >
              View employer page
            </Link>
          </div>
        ) : (
          <p className="text-xs text-ink-subtle italic">Target record no longer available.</p>
        )}

        {/* Review-target content actions */}
        {isReviewTarget && review && report.review_id && (
          <div className="space-y-2">
            <p className="text-xs text-ink-muted">
              <strong className="text-ink">Content actions</strong> — Resolving or dismissing
              a report does not change the review. Hiding or removing the review is a
              separate, deliberate action.
            </p>
            {reviewError && <ErrorAlert message={reviewError} />}
            <NoteTextarea value={reviewNote} onChange={setReviewNote} label="Note for content action" />
            <div className="flex flex-wrap gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={setReviewStatus.isPending}
                      disabled={!isAdmin || review.status === 'hidden'}
                      onClick={() => handleReviewStatus('hidden')}
                    >
                      Hide review
                    </Button>
                  </TooltipTrigger>
                  {!isAdmin && (
                    <TooltipContent>Administrator privileges are required.</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={setReviewStatus.isPending}
                      disabled={!isAdmin || review.status === 'published'}
                      onClick={() => handleReviewStatus('published')}
                    >
                      Restore review
                    </Button>
                  </TooltipTrigger>
                  {!isAdmin && (
                    <TooltipContent>Administrator privileges are required.</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>

              <RemoveReviewDialog reviewId={report.review_id} isAdmin={isAdmin} />
            </div>
          </div>
        )}

        {/* Report status actions */}
        <div className="space-y-2 border-t border-line pt-3">
          <p className="text-xs text-ink-muted">
            <strong className="text-ink">Report actions</strong> — Changing report status
            does not affect the reported content.
          </p>
          {reportError && <ErrorAlert message={reportError} />}
          <NoteTextarea value={reportNote} onChange={setReportNote} label="Note for report action" />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={resolveReport.isPending}
              disabled={report.status === 'under_review'}
              onClick={() => handleReportStatus('under_review')}
            >
              Mark under review
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={resolveReport.isPending}
              disabled={report.status === 'resolved'}
              onClick={() => handleReportStatus('resolved')}
            >
              Resolve
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={resolveReport.isPending}
              disabled={report.status === 'dismissed'}
              onClick={() => handleReportStatus('dismissed')}
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportCardSkeleton() {
  return (
    <div className="rounded-lg border border-line bg-canvas shadow-card animate-pulse">
      <div className="h-10 border-b border-line bg-canvas-subtle rounded-t-lg" />
      <div className="px-4 py-4 space-y-3">
        <div className="h-4 w-1/3 rounded bg-canvas-sunken" />
        <div className="h-16 rounded bg-canvas-sunken" />
        <div className="h-8 w-1/2 rounded bg-canvas-sunken" />
      </div>
    </div>
  )
}

export function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportStatus | 'all'>('open')
  const { data: reports, isLoading, error, refetch } = useReportQueue(activeTab)

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-line" role="tablist" aria-label="Report status filter">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 pb-3 text-sm font-medium border-b-2 transition-colors duration-100 ${
              activeTab === tab.value
                ? 'border-brand text-ink'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4" role="tabpanel">
        {isLoading && (
          <ListSkeleton count={3}>
            <ReportCardSkeleton />
          </ListSkeleton>
        )}

        {!isLoading && error && (
          <ErrorState error={error} onRetry={() => void refetch()} />
        )}

        {!isLoading && !error && reports && reports.length === 0 && (
          <EmptyState
            title="No reports"
            description={`There are no ${activeTab === 'all' ? '' : activeTab + ' '}reports to display.`}
          />
        )}

        {!isLoading && !error && reports && reports.length > 0 &&
          reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))
        }
      </div>
    </div>
  )
}
