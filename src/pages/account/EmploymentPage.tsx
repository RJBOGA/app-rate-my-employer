import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, MapPin, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  useMyEmploymentRecords,
  useUpsertEmploymentRecord,
  useDeleteEmploymentRecord,
  type EmploymentRecordWithEmployer,
} from '@/hooks/useEmployment'
import { formatEmploymentPeriod, formatLocation } from '@/lib/format'
import { toUserMessage } from '@/lib/errors'
import type { EmploymentRecordInput } from '@/lib/validation'
import { EmploymentRecordForm } from '@/components/EmploymentRecordForm'
import { EmptyState, ErrorState, ListSkeleton, EmployerCardSkeleton, PageSpinner } from '@/components/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

interface RecordRowProps {
  record: EmploymentRecordWithEmployer
  userId: string
}

function RecordRow({ record, userId }: RecordRowProps) {
  const [editing, setEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const upsert = useUpsertEmploymentRecord()
  const deleteRecord = useDeleteEmploymentRecord()

  const employer = record.employers
  const employerId = employer?.id ?? record.employer_id
  const employerName = employer?.canonical_name ?? 'Unknown employer'
  const location = formatLocation({
    city: employer?.city,
    country: employer?.country,
  })
  const period = formatEmploymentPeriod(record)

  function handleEdit(input: EmploymentRecordInput) {
    setEditError(null)
    upsert.mutate(
      { userId, recordId: record.id, input },
      {
        onSuccess: () => setEditing(false),
        onError: (err) => setEditError(toUserMessage(err)),
      },
    )
  }

  function handleDelete() {
    setDeleteError(null)
    deleteRecord.mutate(
      { recordId: record.id, employerId },
      {
        onError: (err) => setDeleteError(toUserMessage(err)),
      },
    )
  }

  return (
    <li className="rounded-lg border border-line bg-canvas shadow-card">
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/employers/${employerId}`}
              className="font-semibold text-ink hover:text-brand"
            >
              {employerName}
            </Link>
            <p className="mt-0.5 text-sm text-ink-muted">{record.job_title}</p>
          </div>
          <Badge variant={record.status === 'current' ? 'positive' : 'neutral'}>
            {record.status === 'current' ? 'Current' : 'Former'}
          </Badge>
        </div>

        {/* Meta */}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
          <span>{period}</span>
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {location}
            </span>
          )}
          {record.project_client && (
            <span className="flex items-center gap-1">
              <Briefcase className="size-3.5" aria-hidden="true" />
              {record.project_client}
            </span>
          )}
        </div>

        {/* Delete error */}
        {deleteError && (
          <p
            role="alert"
            className="mt-3 rounded-md bg-critical-subtle px-3 py-2 text-sm text-critical"
          >
            {deleteError}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditing((v) => !v)}
            aria-expanded={editing}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            {editing ? 'Cancel edit' : 'Edit'}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-critical hover:bg-critical-subtle hover:text-critical"
                aria-label={`Delete employment record at ${employerName}`}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete employment record?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes your employment record at{' '}
                  <strong>{employerName}</strong>. Because the database links reviews to
                  employment records,{' '}
                  <strong>the review attached to this record will also be permanently deleted.</strong>{' '}
                  This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep record</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-critical text-canvas hover:bg-critical/90"
                  onClick={handleDelete}
                >
                  {deleteRecord.isPending ? 'Deleting…' : 'Delete permanently'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Inline edit form */}
        {editing && (
          <div className="mt-5 border-t border-line pt-5">
            <EmploymentRecordForm
              employerId={employerId}
              employerName={employerName}
              existing={record}
              onSubmit={handleEdit}
              submitting={upsert.isPending}
              submitLabel="Save changes"
              serverError={editError}
              onCancel={() => {
                setEditing(false)
                setEditError(null)
              }}
            />
          </div>
        )}
      </div>
    </li>
  )
}

export function EmploymentPage() {
  const { user } = useAuth()
  const recordsQuery = useMyEmploymentRecords(user?.id ?? null)

  if (!user) return <PageSpinner />

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="display-lg">Employment Records</h1>
      <p className="mt-2 text-ink-muted">
        Your employment history with desi staffing employers.
      </p>

      {/* Explanatory note */}
      <div className="mt-6 rounded-lg border border-line bg-canvas-subtle px-4 py-4 text-sm text-ink-muted">
        <strong className="font-medium text-ink">Employment records are private.</strong>{' '}
        They are not verified in this version of the site — your account of your own employment
        is taken at face value. A record is never shown publicly on its own; individual fields
        (job title, duration, project/client, location) only become visible when you opt them
        in on a specific review.
      </div>

      <div className="mt-8">
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
            description="Add your first record when you write a review. Employment records back every review you submit."
            action={
              <Button asChild>
                <Link to="/review">Get started</Link>
              </Button>
            }
          />
        )}

        {recordsQuery.isSuccess && recordsQuery.data.length > 0 && (
          <ul className="space-y-4" role="list">
            {recordsQuery.data.map((record) => (
              <RecordRow key={record.id} record={record} userId={user.id} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
