import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { EmployerCombobox } from '@/components/EmployerCombobox'
import { EmployerCard } from '@/components/EmployerCard'
import { EmployerCardSkeleton, EmptyState, ErrorState, ListSkeleton } from '@/components/States'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useEmployerRankings } from '@/hooks/useEmployers'
import { MIN_REVIEWS_FOR_RATING_RANK, RANKING_TABS, type RankingTab } from '@/lib/constants'

export function HomePage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<RankingTab>('highest_rated')
  const { data: employers, isPending, isError, error, refetch } = useEmployerRankings(tab)

  return (
    <>
      {/* ---- Masthead ------------------------------------------------ */}
      <section className="border-b border-line bg-canvas-subtle">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="display-xl text-ink">
              Know who you are signing with.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-ink-muted">
              Anonymous, first-hand accounts of working at Desi-owned and Desi-focused
              employers and consultancies — pay, bench time, visa handling, and how
              management actually behaves.
            </p>

            <div className="mt-8 max-w-xl">
              <EmployerCombobox
                label="Search for an employer"
                hideLabel={false}
                placeholder="Try “Tata Consultancy”, “TCS”, or a consultancy name…"
                onSelect={(employer) => navigate(`/employers/${employer.id}`)}
              />
            </div>

            <p className="mt-4 flex items-start gap-2 text-sm text-privacy">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                Browse and read freely — no account needed. Reviews are anonymous by
                default, and your email and phone are never shown.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ---- Rankings ------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl text-ink">Employers</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {tab === 'highest_rated'
                ? `Rated by employees, weighted so that employers with only a handful of reviews do not outrank those with hundreds.`
                : 'Ranked across the whole directory.'}
            </p>
          </div>

          <Button variant="secondary" size="sm" asChild>
            <Link to="/search">Browse all</Link>
          </Button>
        </div>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as RankingTab)}
          className="mt-6"
        >
          <TabsList aria-label="Ranking order">
            {RANKING_TABS.map((option) => (
              <TabsTrigger key={option.value} value={option.value}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="mt-6">
          {isPending ? (
            <ListSkeleton count={6}>
              <EmployerCardSkeleton />
            </ListSkeleton>
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : employers.length === 0 ? (
            <EmptyState
              title={
                tab === 'highest_rated'
                  ? 'Not enough reviews yet'
                  : 'No employers here yet'
              }
              description={
                tab === 'highest_rated'
                  ? `Employers appear in this ranking once they have at least ${MIN_REVIEWS_FOR_RATING_RANK} reviews. Try “Newest” to see recently added employers.`
                  : 'Be the first to add an employer and share your experience.'
              }
              action={
                <Button asChild>
                  <Link to="/review">Write the first review</Link>
                </Button>
              }
            />
          ) : (
            <ol className="grid gap-3 sm:grid-cols-2">
              {employers.map((employer, index) => (
                <li key={employer.id}>
                  <EmployerCard
                    employer={employer}
                    rank={tab === 'newest' ? undefined : index + 1}
                  />
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* ---- How it works -------------------------------------------- */}
      <section className="border-t border-line bg-canvas-subtle">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl text-ink">How this works</h2>
          <dl className="mt-6 grid gap-8 sm:grid-cols-3">
            <div>
              <dt className="font-medium text-ink">One review per employer</dt>
              <dd className="mt-1 text-sm text-ink-muted">
                You review each employer once, and you can edit it later as your
                experience changes. No brigading, no duplicate accounts inflating a score.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Anonymous unless you decide otherwise</dt>
              <dd className="mt-1 text-sm text-ink-muted">
                Every identifying detail starts hidden. You choose field by field what to
                publish. Email and phone can never be published at all.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Moderated, not censored</dt>
              <dd className="mt-1 text-sm text-ink-muted">
                Anyone can report a review. Nothing is removed automatically — a moderator
                reads the report and every decision is recorded.
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </>
  )
}
