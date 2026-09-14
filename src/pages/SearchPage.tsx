import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { EmployerCard } from '@/components/EmployerCard'
import { EmployerCardSkeleton, EmptyState, ErrorState, ListSkeleton } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RatingValue } from '@/components/RatingStars'
import { useDebounce } from '@/hooks/useDebounce'
import { useEmployerRankings, useEmployerSearch } from '@/hooks/useEmployers'
import { RANKING_TABS, type RankingTab } from '@/lib/constants'
import { formatLocation, formatReviewCount } from '@/lib/format'
import { pressableSubtle } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * Full-page browse.
 *
 * With a query this is a results page backed by the same alias-aware
 * search the typeahead uses; without one it is the directory, ordered by
 * whichever ranking the visitor picks.
 */
export function SearchPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const [input, setInput] = useState(query)
  const [tab, setTab] = useState<RankingTab>('most_reviewed')

  const debounced = useDebounce(input, 200)
  const searching = debounced.trim().length >= 2

  const searchQuery = useEmployerSearch(debounced, 25)
  const directoryQuery = useEmployerRankings(tab, 60)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const next = input.trim()
    setParams(next ? { q: next } : {}, { replace: true })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="display-lg text-ink">Browse employers</h1>
      <p className="mt-2 max-w-xl text-ink-muted">
        Search by name or a common abbreviation. No account needed to read anything here.
      </p>

      <form onSubmit={handleSubmit} className="mt-6" role="search">
        <label htmlFor="directory-search" className="sr-only">
          Search employers
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle"
            aria-hidden="true"
          />
          <Input
            id="directory-search"
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Employer name or abbreviation…"
            className="h-11 pl-9"
            autoComplete="off"
          />
        </div>
      </form>

      {searching ? (
        <section className="mt-8" aria-live="polite">
          <h2 className="eyebrow">Results for “{debounced.trim()}”</h2>

          <div className="mt-4">
            {searchQuery.isPending ? (
              <ListSkeleton count={4}>
                <EmployerCardSkeleton />
              </ListSkeleton>
            ) : searchQuery.isError ? (
              <ErrorState error={searchQuery.error} onRetry={() => void searchQuery.refetch()} />
            ) : searchQuery.data.length === 0 ? (
              <EmptyState
                title={`No employers match “${debounced.trim()}”`}
                description="Check the spelling, or add the employer when you write your review."
                action={
                  <Button asChild>
                    <Link to="/review">Add an employer</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {searchQuery.data.map((employer) => {
                  const location = formatLocation({
                    city: employer.city,
                    state: employer.state,
                    country: employer.country,
                  })
                  return (
                    <li key={employer.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/employers/${employer.id}`)}
                        className={cn(
                          'block w-full rounded-lg border border-line bg-canvas p-4 text-left shadow-card',
                          'hover:border-line-strong hover:shadow-raised',
                          'transition-[box-shadow,border-color] duration-150',
                          pressableSubtle,
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate font-serif text-lg text-ink">
                              {employer.canonical_name}
                            </p>
                            <p className="mt-0.5 text-sm text-ink-muted" data-numeric>
                              {formatReviewCount(employer.review_count)}
                              {location ? ` · ${location}` : ''}
                            </p>
                            {employer.matched_alias && (
                              <p className="mt-0.5 text-xs text-ink-subtle">
                                also known as “{employer.matched_alias}”
                              </p>
                            )}
                          </div>
                          <RatingValue value={employer.avg_rating} className="shrink-0 text-lg" />
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      ) : (
        <section className="mt-8">
          <Tabs value={tab} onValueChange={(value) => setTab(value as RankingTab)}>
            <TabsList aria-label="Directory order">
              {RANKING_TABS.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="mt-6">
            {directoryQuery.isPending ? (
              <ListSkeleton count={8}>
                <EmployerCardSkeleton />
              </ListSkeleton>
            ) : directoryQuery.isError ? (
              <ErrorState
                error={directoryQuery.error}
                onRetry={() => void directoryQuery.refetch()}
              />
            ) : directoryQuery.data.length === 0 ? (
              <EmptyState
                title="No employers yet"
                description="The directory is built by the people who use it."
                action={
                  <Button asChild>
                    <Link to="/review">Add the first employer</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {directoryQuery.data.map((employer) => (
                  <li key={employer.id}>
                    <EmployerCard employer={employer} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
