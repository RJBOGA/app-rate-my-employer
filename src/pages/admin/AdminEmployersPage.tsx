import { useState } from 'react'
import {
  useAdminEmployers,
  useAdminUpdateEmployer,
  useAddEmployerAlias,
  useMergeEmployers,
} from '@/hooks/useAdmin'
import type { MergeResult } from '@/hooks/useAdmin'
import type { EmployerStatus } from '@/lib/database.types'
import { toUserMessage } from '@/lib/errors'
import { formatRelativeDate, formatLocation } from '@/lib/format'
import { useDebounce } from '@/hooks/useDebounce'
import { EmptyState, ErrorState } from '@/components/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Textarea } from '@/components/ui/textarea'
import { EmployerCombobox } from '@/components/EmployerCombobox'
import type { EmployerSearchResult } from '@/lib/database.types'
import { useAuth } from '@/hooks/useAuth'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { Button as Btn } from '@/components/ui/button'

function ErrorAlert({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-md bg-critical-subtle px-3 py-2 text-sm text-critical">
      {message}
    </p>
  )
}

function StatusBadge({ status }: { status: EmployerStatus }) {
  if (status === 'active') return <Badge variant="positive">Active</Badge>
  if (status === 'hidden') return <Badge variant="caution">Hidden</Badge>
  if (status === 'removed') return <Badge variant="critical">Removed</Badge>
  if (status === 'merged') return <Badge variant="neutral">Merged</Badge>
  return <Badge>{status}</Badge>
}

type AdminEmployer = {
  id: string
  canonical_name: string
  country: string
  state: string | null
  city: string | null
  status: EmployerStatus
  created_at: string
  merged_into_id: string | null
}

function EditEmployerDialog({ employer }: { employer: AdminEmployer }) {
  const { isAdmin } = useAuth()
  const updateEmployer = useAdminUpdateEmployer()
  const [open, setOpen] = useState(false)

  const [canonicalName, setCanonicalName] = useState(employer.canonical_name)
  const [website, setWebsite] = useState('')
  const [country, setCountry] = useState(employer.country)
  const [state, setState] = useState(employer.state ?? '')
  const [city, setCity] = useState(employer.city ?? '')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Exclude<EmployerStatus, 'merged'>>(
    employer.status === 'merged' ? 'active' : employer.status,
  )
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    updateEmployer.mutate(
      {
        employerId: employer.id,
        canonicalName: canonicalName || undefined,
        website: website || null,
        country: country || undefined,
        state: state || null,
        city: city || null,
        description: description || null,
        status,
      },
      {
        onSuccess: () => setOpen(false),
        onError: (err) => setError(toUserMessage(err)),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm" disabled={!isAdmin}>
                Edit
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          {!isAdmin && (
            <TooltipContent>Administrator privileges are required to edit employers.</TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit employer</DialogTitle>
          <DialogDescription>
            Renaming automatically preserves the old canonical name as an alias so existing
            links and searches continue to work.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <ErrorAlert message={error} />}

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Canonical name</label>
            <Input
              value={canonicalName}
              onChange={(e) => setCanonicalName(e.target.value)}
              placeholder="Canonical employer name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Website</label>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Country</label>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="US"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">State</label>
              <Input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="CA"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">City</label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="San Francisco"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of the employer"
              className="min-h-[80px]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Exclude<EmployerStatus, 'merged'>)}
              className="flex h-10 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:border-brand"
            >
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
              <option value="removed">Removed</option>
            </select>
            <p className="mt-1 text-xs text-ink-muted">
              "Merged" is set automatically by the merge operation and cannot be assigned manually.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={updateEmployer.isPending}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AddAliasDialog({ employer }: { employer: AdminEmployer }) {
  const { isAdmin } = useAuth()
  const addAlias = useAddEmployerAlias()
  const [open, setOpen] = useState(false)
  const [alias, setAlias] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!alias.trim()) return
    setError(null)
    addAlias.mutate(
      { employerId: employer.id, alias: alias.trim() },
      {
        onSuccess: () => {
          setAlias('')
          setOpen(false)
        },
        onError: (err) => setError(toUserMessage(err)),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" disabled={!isAdmin}>
                Add alias
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          {!isAdmin && (
            <TooltipContent>Administrator privileges are required to add aliases.</TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add alias for {employer.canonical_name}</DialogTitle>
          <DialogDescription>
            Aliases are alternative names the employer is known by. They improve search
            matching without changing the canonical name.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <ErrorAlert message={error} />}
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Alias</label>
            <Input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Alternative name"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={addAlias.isPending} disabled={!alias.trim()}>
              Add alias
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MergeResult({ result }: { result: MergeResult }) {
  return (
    <div className="rounded-md border border-line bg-canvas-subtle px-4 py-3 text-sm space-y-1">
      <p className="font-semibold text-ink">Merge completed</p>
      <ul className="text-ink-muted space-y-0.5 list-none">
        <li>Employment records moved: <strong className="text-ink">{result.moved_employment_records}</strong></li>
        <li>Reviews moved: <strong className="text-ink">{result.moved_reviews}</strong></li>
        <li>Aliases moved: <strong className="text-ink">{result.moved_aliases}</strong></li>
        {result.discarded_conflict_count > 0 && (
          <li className="mt-2 rounded-md bg-caution-subtle px-3 py-2 text-caution">
            <strong>{result.discarded_conflict_count}</strong> duplicate record
            {result.discarded_conflict_count !== 1 ? 's were' : ' was'} discarded. Users who had
            records at both employers kept their target-side record; the source-side duplicate was
            discarded. The full content of each discarded record is preserved in the audit log.
          </li>
        )}
      </ul>
    </div>
  )
}

function MergeEmployerDialog({ employer }: { employer: AdminEmployer }) {
  const { isAdmin } = useAuth()
  const mergeEmployers = useMergeEmployers()
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<EmployerSearchResult | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null)

  function handleMerge() {
    if (!target) return
    setError(null)
    mergeEmployers.mutate(
      { sourceId: employer.id, targetId: target.id, note: note || undefined },
      {
        onSuccess: (result) => {
          setMergeResult(result)
        },
        onError: (err) => setError(toUserMessage(err)),
      },
    )
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setTarget(null)
      setNote('')
      setError(null)
      setMergeResult(null)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Btn variant="ghost" size="sm" disabled={!isAdmin || employer.status === 'merged'}>
                Merge into…
              </Btn>
            </AlertDialogTrigger>
          </TooltipTrigger>
          {!isAdmin && (
            <TooltipContent>Administrator privileges are required to merge employers.</TooltipContent>
          )}
          {isAdmin && employer.status === 'merged' && (
            <TooltipContent>This employer has already been merged.</TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Merge "{employer.canonical_name}" into another employer</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-ink-muted">
              <p>
                This operation is <strong className="text-critical">irreversible through the UI</strong>.
                Merging will:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Retire the source employer ("{employer.canonical_name}") — it will be marked as merged.</li>
                <li>Move all reviews and employment records to the target employer.</li>
                <li>Convert the source name to an alias on the target so existing links continue to work.</li>
                <li>Move all existing aliases from the source to the target.</li>
              </ul>
              <p>
                If a user had records at both employers, the target-side record is kept and the
                source-side duplicate is discarded. The discarded record is preserved in the audit log.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {mergeResult ? (
          <MergeResult result={mergeResult} />
        ) : (
          <div className="space-y-3">
            {error && <ErrorAlert message={error} />}

            <div>
              <p className="mb-1 text-sm font-medium text-ink">Merge target (destination employer)</p>
              <EmployerCombobox
                onSelect={(emp) => setTarget(emp)}
                placeholder="Search for target employer…"
                label="Target employer"
                hideLabel={false}
              />
              {target && (
                <p className="mt-1 text-sm text-positive">
                  Selected: <strong>{target.canonical_name}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Note (audit trail)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note explaining the reason for merging"
                className="flex w-full min-h-[72px] rounded-md border border-line-strong bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-subtle resize-y focus-visible:outline-none focus-visible:border-brand"
              />
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleOpenChange(false)}>
            {mergeResult ? 'Close' : 'Cancel'}
          </AlertDialogCancel>
          {!mergeResult && (
            <button
              onClick={handleMerge}
              disabled={!target || mergeEmployers.isPending}
              aria-busy={mergeEmployers.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-critical px-4 h-10 text-sm font-medium text-canvas transition-colors duration-100 disabled:opacity-50 disabled:pointer-events-none hover:bg-critical/90"
            >
              {mergeEmployers.isPending && (
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Merge employers — this cannot be undone
            </button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function EmployerRow({ employer }: { employer: AdminEmployer }) {
  const isMerged = employer.status === 'merged'
  const location = formatLocation({
    city: employer.city,
    state: employer.state,
    country: employer.country,
  })

  return (
    <div
      className={`rounded-lg border border-line bg-canvas shadow-card px-4 py-4 ${isMerged ? 'opacity-50' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink truncate">{employer.canonical_name}</span>
            <StatusBadge status={employer.status} />
            {isMerged && (
              <span className="text-xs text-ink-muted">(merged into another employer)</span>
            )}
          </div>
          {location && <p className="mt-0.5 text-sm text-ink-muted">{location}</p>}
          <p className="mt-0.5 text-xs text-ink-subtle">
            Added {formatRelativeDate(employer.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <EditEmployerDialog employer={employer} />
          <AddAliasDialog employer={employer} />
          <MergeEmployerDialog employer={employer} />
        </div>
      </div>
    </div>
  )
}

function EmployerSkeleton() {
  return (
    <div className="rounded-lg border border-line bg-canvas shadow-card px-4 py-4 animate-pulse">
      <div className="flex justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="h-5 w-1/2 rounded bg-canvas-sunken" />
          <div className="h-4 w-1/3 rounded bg-canvas-sunken" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-14 rounded bg-canvas-sunken" />
          <div className="h-8 w-20 rounded bg-canvas-sunken" />
          <div className="h-8 w-24 rounded bg-canvas-sunken" />
        </div>
      </div>
    </div>
  )
}

export function AdminEmployersPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 250)
  const { data: employers, isLoading, error, refetch } = useAdminEmployers(debouncedSearch)

  return (
    <div>
      <div className="mb-5">
        <label htmlFor="employer-search" className="mb-1 block text-sm font-medium text-ink">
          Search employers
        </label>
        <Input
          id="employer-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type a name to filter…"
          className="max-w-sm"
        />
      </div>

      <div className="space-y-3">
        {isLoading && (
          <>
            <EmployerSkeleton />
            <EmployerSkeleton />
            <EmployerSkeleton />
          </>
        )}

        {!isLoading && error && (
          <ErrorState error={error} onRetry={() => void refetch()} />
        )}

        {!isLoading && !error && employers && employers.length === 0 && (
          <EmptyState
            title="No employers found"
            description={search ? `No employers match "${search}".` : 'No employers have been added yet.'}
          />
        )}

        {!isLoading && !error && employers && employers.map((employer) => (
          <EmployerRow key={employer.id} employer={employer} />
        ))}
      </div>
    </div>
  )
}
