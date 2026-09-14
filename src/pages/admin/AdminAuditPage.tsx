import { useAuditLog } from '@/hooks/useAdmin'
import type { ModerationAuditRow, Json } from '@/lib/database.types'
import { formatAbsoluteDate, formatRelativeDate } from '@/lib/format'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/States'

const ACTION_LABELS: Record<string, string> = {
  'review.status_change': 'Review status changed',
  'user.suspend': 'User suspended',
  'user.reinstate': 'User reinstated',
  'report.resolved': 'Report resolved',
  'report.dismissed': 'Report dismissed',
  'report.under_review': 'Report marked under review',
  'employer.update': 'Employer edited',
  'employer.merge': 'Employers merged',
  'employer.alias_add': 'Alias added',
}

function humaniseAction(action: string): string {
  return ACTION_LABELS[action] ?? action
}

function JsonDetails({ label, value }: { label: string; value: Json | null }) {
  if (value === null) return null
  return (
    <details className="mt-1">
      <summary className="cursor-pointer select-none text-xs text-ink-muted hover:text-ink">
        {label}
      </summary>
      <pre className="font-mono text-xs bg-canvas-sunken rounded-md p-3 overflow-x-auto mt-1 whitespace-pre-wrap break-all">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  )
}

function AuditEntry({ entry }: { entry: ModerationAuditRow }) {
  const shortTargetId = entry.target_id ? entry.target_id.slice(0, 8) : null
  const shortActorId = entry.actor_id ? entry.actor_id.slice(0, 8) : null
  const hasJsonDiff = entry.before !== null || entry.after !== null

  return (
    <div className="rounded-lg border border-line bg-canvas shadow-card px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-ink text-sm">{humaniseAction(entry.action)}</p>
          <p className="text-xs text-ink-muted">
            <span className="text-ink-subtle eyebrow">{entry.target_type}</span>
            {shortTargetId && (
              <>
                {' · '}
                <span className="font-mono">{shortTargetId}&hellip;</span>
              </>
            )}
            {' · '}
            Actor:{' '}
            {shortActorId ? (
              <span className="font-mono">{shortActorId}&hellip;</span>
            ) : (
              <span className="italic">system</span>
            )}
          </p>
          {entry.note && (
            <p className="text-sm text-ink-muted italic">{entry.note}</p>
          )}
        </div>

        <time
          dateTime={entry.created_at}
          title={formatRelativeDate(entry.created_at)}
          className="text-xs text-ink-subtle shrink-0"
        >
          {formatAbsoluteDate(entry.created_at)}
        </time>
      </div>

      {hasJsonDiff && (
        <div className="mt-2">
          <JsonDetails label="Before" value={entry.before} />
          <JsonDetails label="After" value={entry.after} />
        </div>
      )}
    </div>
  )
}

function AuditSkeleton() {
  return (
    <div className="rounded-lg border border-line bg-canvas shadow-card px-4 py-4 animate-pulse">
      <div className="flex justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="h-4 w-1/3 rounded bg-canvas-sunken" />
          <div className="h-3 w-1/2 rounded bg-canvas-sunken" />
        </div>
        <div className="h-3 w-24 rounded bg-canvas-sunken" />
      </div>
    </div>
  )
}

export function AdminAuditPage() {
  const { data: entries, isLoading, error, refetch } = useAuditLog(100)

  return (
    <div>
      <p className="mb-5 rounded-md border border-line bg-canvas-subtle px-4 py-3 text-sm text-ink-muted">
        This log is append-only and cannot be edited or deleted through the application.
      </p>

      <div className="space-y-3">
        {isLoading && (
          <ListSkeleton count={5}>
            <AuditSkeleton />
          </ListSkeleton>
        )}

        {!isLoading && error && (
          <ErrorState error={error} onRetry={() => void refetch()} />
        )}

        {!isLoading && !error && entries && entries.length === 0 && (
          <EmptyState
            title="No audit entries"
            description="No moderation actions have been recorded yet."
          />
        )}

        {!isLoading && !error && entries && entries.map((entry) => (
          <AuditEntry key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}
