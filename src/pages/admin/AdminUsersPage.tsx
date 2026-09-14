import { useState } from 'react'
import { useAdminUsers, useSetUserSuspension } from '@/hooks/useAdmin'
import { toUserMessage } from '@/lib/errors'
import { formatAbsoluteDate, formatRelativeDate } from '@/lib/format'
import { useDebounce } from '@/hooks/useDebounce'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/hooks/useAuth'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

type AdminUser = {
  id: string
  display_name: string | null
  full_name: string | null
  is_suspended: boolean
  suspended_at: string | null
  suspension_reason: string | null
  created_at: string
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-md bg-critical-subtle px-3 py-2 text-sm text-critical">
      {message}
    </p>
  )
}

function SuspensionBadge({ isSuspended }: { isSuspended: boolean }) {
  if (isSuspended) return <Badge variant="critical">Suspended</Badge>
  return <Badge variant="positive">Active</Badge>
}

function SuspendDialog({ user, isAdmin }: { user: AdminUser; isAdmin: boolean }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const suspension = useSetUserSuspension()

  const reasonTrimmed = reason.trim()
  const reasonTooShort = reasonTrimmed.length > 0 && reasonTrimmed.length < 5
  const canSubmit = reasonTrimmed.length >= 5

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setReason('')
      setError(null)
    }
  }

  function handleSuspend() {
    if (!canSubmit) return
    setError(null)
    suspension.mutate(
      { userId: user.id, suspended: true, reason: reasonTrimmed },
      {
        onSuccess: () => setOpen(false),
        onError: (err) => setError(toUserMessage(err)),
      },
    )
  }

  const displayName = user.display_name ?? 'this user'

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button variant="danger" size="sm" disabled={!isAdmin}>
                Suspend
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          {!isAdmin && (
            <TooltipContent>Administrator privileges required</TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Suspend {displayName}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-1 text-sm text-ink-muted">
              <p>Suspending this account will:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>Block the user from posting reviews, employment records, and reports.</li>
                <li>
                  Existing content is{' '}
                  <strong className="text-ink">not deleted</strong>.
                </li>
                <li>This action is recorded in the audit log.</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && <ErrorAlert message={error} />}

        <div>
          <label
            htmlFor={`suspend-reason-${user.id}`}
            className="mb-1 block text-sm font-medium text-ink"
          >
            Reason for suspension <span aria-hidden="true">(required)</span>
          </label>
          <Textarea
            id={`suspend-reason-${user.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter a reason (min 5 characters)"
            className="min-h-[72px] text-sm"
            aria-describedby={reasonTooShort ? `suspend-reason-error-${user.id}` : undefined}
          />
          {reasonTooShort && (
            <p
              id={`suspend-reason-error-${user.id}`}
              role="alert"
              className="mt-1 text-xs text-critical"
            >
              Reason must be at least 5 characters.
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <button
            onClick={handleSuspend}
            disabled={!canSubmit || suspension.isPending}
            aria-busy={suspension.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-critical px-4 h-10 text-sm font-medium text-canvas transition-colors duration-100 disabled:opacity-50 disabled:pointer-events-none hover:bg-critical/90"
          >
            {suspension.isPending && (
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            Suspend user
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ReinstateDialog({ user, isAdmin }: { user: AdminUser; isAdmin: boolean }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const suspension = useSetUserSuspension()

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setNote('')
      setError(null)
    }
  }

  function handleReinstate() {
    setError(null)
    suspension.mutate(
      { userId: user.id, suspended: false, reason: note.trim() || undefined },
      {
        onSuccess: () => setOpen(false),
        onError: (err) => setError(toUserMessage(err)),
      },
    )
  }

  const displayName = user.display_name ?? 'this user'

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button variant="secondary" size="sm" disabled={!isAdmin}>
                Reinstate
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          {!isAdmin && (
            <TooltipContent>Administrator privileges required</TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reinstate {displayName}?</AlertDialogTitle>
          <AlertDialogDescription>
            The user will regain the ability to post reviews, employment records, and reports.
            This action is recorded in the audit log.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && <ErrorAlert message={error} />}

        <div>
          <label
            htmlFor={`reinstate-note-${user.id}`}
            className="mb-1 block text-sm font-medium text-ink"
          >
            Note (optional)
          </label>
          <Textarea
            id={`reinstate-note-${user.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (recorded in audit log)"
            className="min-h-[72px] text-sm"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <button
            onClick={handleReinstate}
            disabled={suspension.isPending}
            aria-busy={suspension.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-positive px-4 h-10 text-sm font-medium text-canvas transition-colors duration-100 disabled:opacity-50 disabled:pointer-events-none hover:bg-positive/90"
          >
            {suspension.isPending && (
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            Reinstate user
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function UserCard({ user }: { user: AdminUser }) {
  const { isAdmin } = useAuth()
  const shortId = user.id.slice(0, 8)

  return (
    <div className="rounded-lg border border-line bg-canvas shadow-card px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">
              {user.display_name ?? 'Unnamed user'}
            </span>
            <SuspensionBadge isSuspended={user.is_suspended} />
          </div>
          {user.full_name && (
            <p className="text-sm text-ink-muted">{user.full_name}</p>
          )}
          <p className="text-xs text-ink-subtle">
            <span className="font-mono">{shortId}&hellip;</span>
            {' · '}
            Joined{' '}
            <time
              dateTime={user.created_at}
              title={formatAbsoluteDate(user.created_at)}
            >
              {formatRelativeDate(user.created_at)}
            </time>
          </p>
          {user.is_suspended && user.suspension_reason && (
            <p className="mt-1 text-sm text-critical">
              <strong>Suspension reason:</strong> {user.suspension_reason}
            </p>
          )}
          {user.is_suspended && user.suspended_at && (
            <p className="text-xs text-ink-subtle">
              Suspended{' '}
              <time
                dateTime={user.suspended_at}
                title={formatAbsoluteDate(user.suspended_at)}
              >
                {formatRelativeDate(user.suspended_at)}
              </time>
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {user.is_suspended ? (
            <ReinstateDialog user={user} isAdmin={isAdmin} />
          ) : (
            <SuspendDialog user={user} isAdmin={isAdmin} />
          )}
        </div>
      </div>
    </div>
  )
}

function UserSkeleton() {
  return (
    <div className="rounded-lg border border-line bg-canvas shadow-card px-4 py-4 animate-pulse">
      <div className="flex justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="h-5 w-1/3 rounded bg-canvas-sunken" />
          <div className="h-4 w-1/4 rounded bg-canvas-sunken" />
          <div className="h-3 w-1/2 rounded bg-canvas-sunken" />
        </div>
        <div className="h-8 w-20 rounded bg-canvas-sunken" />
      </div>
    </div>
  )
}

export function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 250)
  const { data: users, isLoading, error, refetch } = useAdminUsers(debouncedSearch)

  return (
    <div>
      <div className="mb-5">
        <label htmlFor="user-search" className="mb-1 block text-sm font-medium text-ink">
          Search users
        </label>
        <Input
          id="user-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type a display name to filter&hellip;"
          className="max-w-sm"
        />
      </div>

      <div className="space-y-3">
        {isLoading && (
          <ListSkeleton count={3}>
            <UserSkeleton />
          </ListSkeleton>
        )}

        {!isLoading && error && (
          <ErrorState error={error} onRetry={() => void refetch()} />
        )}

        {!isLoading && !error && users && users.length === 0 && (
          <EmptyState
            title="No users found"
            description={
              search ? `No users match "${search}".` : 'No users have been added yet.'
            }
          />
        )}

        {!isLoading && !error && users && users.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>
    </div>
  )
}
