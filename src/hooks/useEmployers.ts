import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { MIN_REVIEWS_FOR_RATING_RANK, type RankingTab } from '@/lib/constants'
import type {
  EmployerRankingRow,
  EmployerRow,
  EmployerSearchResult,
  EmployerStatsRow,
} from '@/lib/database.types'
import type { EmployerInput } from '@/lib/validation'

/** Typeahead. Resolves aliases too, so "TCS" finds Tata Consultancy Services. */
export function useEmployerSearch(query: string, limit = 8) {
  const trimmed = query.trim()

  return useQuery({
    queryKey: ['employer-search', trimmed, limit],
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
    // Keeps the previous list on screen while the next one loads, so the
    // dropdown does not flash empty between keystrokes.
    placeholderData: (previous) => previous,
    queryFn: async (): Promise<EmployerSearchResult[]> => {
      const { data, error } = await supabase.rpc('search_employers', {
        p_query: trimmed,
        p_limit: limit,
      })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useEmployerRankings(tab: RankingTab, limit = 24) {
  return useQuery({
    queryKey: ['employer-rankings', tab, limit],
    staleTime: 60_000,
    queryFn: async (): Promise<EmployerRankingRow[]> => {
      let query = supabase.from('employer_rankings').select('*')

      switch (tab) {
        case 'highest_rated':
          // The Bayesian score already prevents a 2-review employer from
          // topping a 400-review one, but an employer with *zero* reviews
          // scores exactly the global mean and would sit mid-table. A
          // floor keeps the list meaningful.
          query = query
            .gte('review_count', MIN_REVIEWS_FOR_RATING_RANK)
            .order('weighted_score', { ascending: false, nullsFirst: false })
          break
        case 'most_reviewed':
          query = query
            .gt('review_count', 0)
            .order('review_count', { ascending: false, nullsFirst: false })
          break
        case 'most_employees':
          query = query
            .gt('employee_count', 0)
            .order('employee_count', { ascending: false, nullsFirst: false })
          break
        case 'newest':
          query = query.order('created_at', { ascending: false, nullsFirst: false })
          break
      }

      const { data, error } = await query.limit(limit)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useEmployer(employerId: string | undefined) {
  return useQuery({
    queryKey: ['employer', employerId],
    enabled: Boolean(employerId),
    staleTime: 60_000,
    queryFn: async (): Promise<EmployerRow | null> => {
      if (!employerId) return null
      const { data, error } = await supabase
        .from('employers')
        .select('*')
        .eq('id', employerId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useEmployerStats(employerId: string | undefined) {
  return useQuery({
    queryKey: ['employer-stats', employerId],
    enabled: Boolean(employerId),
    staleTime: 60_000,
    queryFn: async (): Promise<EmployerStatsRow | null> => {
      if (!employerId) return null
      const { data, error } = await supabase
        .from('employer_stats')
        .select('*')
        .eq('employer_id', employerId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useEmployerAliases(employerId: string | undefined) {
  return useQuery({
    queryKey: ['employer-aliases', employerId],
    enabled: Boolean(employerId),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!employerId) return []
      const { data, error } = await supabase
        .from('employer_aliases')
        .select('id, alias, source')
        .eq('employer_id', employerId)
        .order('alias')
      if (error) throw error
      return data ?? []
    },
  })
}

/**
 * The three shapes create_employer() can return. The server decides
 * which — the client cannot skip the duplicate check by omitting a flag,
 * because employers has no INSERT policy at all.
 */
export type CreateEmployerResult =
  | { status: 'created'; employer: EmployerRow }
  | { status: 'duplicate'; matched_on: 'canonical_name' | 'alias' | 'race'; employer: EmployerRow }
  | {
      status: 'needs_confirmation'
      candidates: Array<{
        id: string
        canonical_name: string
        country: string | null
        state: string | null
        city: string | null
        review_count: number
        avg_rating: number | null
        similarity: number
      }>
    }

export function useCreateEmployer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      input: EmployerInput & { confirmSimilar?: boolean },
    ): Promise<CreateEmployerResult> => {
      const { data, error } = await supabase.rpc('create_employer', {
        p_canonical_name: input.canonical_name,
        p_country: input.country,
        p_state: input.state,
        p_city: input.city,
        p_website: input.website,
        p_description: input.description,
        p_confirm_similar: input.confirmSimilar ?? false,
      })
      if (error) throw error
      return data as unknown as CreateEmployerResult
    },
    onSuccess: (result) => {
      if (result.status === 'created') {
        void queryClient.invalidateQueries({ queryKey: ['employer-rankings'] })
        void queryClient.invalidateQueries({ queryKey: ['employer-search'] })
      }
    },
  })
}
