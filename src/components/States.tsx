import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toUserMessage } from '@/lib/errors'

/**
 * Shared empty / error / loading states.
 *
 * Every list and detail surface uses these, so the three states are
 * never an afterthought on one screen and polished on another.
 */

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-12 text-center',
        className,
      )}
    >
      <span className="text-ink-subtle" aria-hidden="true">
        {icon ?? <Inbox className="size-8" />}
      </span>
      <h3 className="mt-3 font-medium text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({
  error,
  onRetry,
  title = 'Something went wrong',
  className,
}: {
  error: unknown
  onRetry?: () => void
  title?: string
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-critical/30 bg-critical-subtle px-6 py-10 text-center',
        className,
      )}
    >
      <AlertTriangle className="size-7 text-critical" aria-hidden="true" />
      <h3 className="mt-3 font-medium text-ink">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-ink-muted">{toUserMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  )
}

export function EmployerCardSkeleton() {
  return (
    <div className="rounded-lg border border-line bg-canvas p-4">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/5" />
        </div>
        <Skeleton className="h-6 w-12" />
      </div>
    </div>
  )
}

export function ReviewSkeleton() {
  return (
    <div className="space-y-3 border-b border-line py-6 last:border-b-0">
      <div className="flex justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  )
}

export function ListSkeleton({
  count = 5,
  children,
}: {
  count?: number
  children: ReactNode
}) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>{children}</div>
      ))}
    </div>
  )
}

export function PageSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="space-y-3" aria-hidden="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-4 w-80" />
      </div>
    </div>
  )
}
