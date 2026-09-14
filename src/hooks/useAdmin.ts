import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  EmployerStatus,
  ModerationAuditRow,
  ReportRow,
  ReportStatus,
  ReviewRow,
  ReviewStatus,
} from '@/lib/database.types'

/**
 * Admin data access.
 *
 * Every mutation here goes through a SECURITY DEFINER function that
 * calls require_admin() server-side and writes an audit row. Nothing in
 * this file is trusted to be reachable only by admins — hiding the UI is
 * a convenience, the database is the control.
 */

export interface ReportWithTargets extends ReportRow {
  reviews: Pick<ReviewRow, 'id' | 'title' | 'body' | 'status' | 'employer_id'> | null
  employers: { id: string; canonical_name: string } | null
}

export function useReportQueue(status: ReportStatus | 'all' = 'open') {
  return useQuery({
    queryKey: ['admin-reports', status],
    staleTime: 15_000,
    queryFn: async (): Promise<ReportWithTargets[]> => {
      let query = supabase
        .from('reports')
        .select(
          '*, reviews ( id, title, body, status, employer_id ), employers ( id, canonical_name )',
        )
        .order('created_at', { ascending: false })

      if (status !== 'all') query = query.eq('status', status)

      const { data, error } = await query.limit(200)
      if (error) throw error
      return (data ?? []) as unknown as ReportWithTargets[]
    },
  })
}

export function useReportCounts() {
  return useQuery({
    queryKey: ['admin-report-counts'],
    staleTime: 15_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open')
      if (error) throw error
      return { open: count ?? 0 }
    },
  })
}

function invalidateModeration(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
  void queryClient.invalidateQueries({ queryKey: ['admin-report-counts'] })
  void queryClient.invalidateQueries({ queryKey: ['admin-audit'] })
  void queryClient.invalidateQueries({ queryKey: ['public-reviews'] })
  void queryClient.invalidateQueries({ queryKey: ['employer-stats'] })
  void queryClient.invalidateQueries({ queryKey: ['employer-rankings'] })
}

export function useSetReviewStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: { reviewId: string; status: ReviewStatus; note?: string }) => {
      const { data, error } = await supabase.rpc('set_review_status', {
        p_review_id: args.reviewId,
        p_status: args.status,
        p_note: args.note ?? null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateModeration(queryClient),
  })
}

export function useResolveReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: { reportId: string; status: ReportStatus; note?: string }) => {
      const { data, error } = await supabase.rpc('resolve_report', {
        p_report_id: args.reportId,
        p_status: args.status,
        p_note: args.note ?? null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateModeration(queryClient),
  })
}

export function useSetUserSuspension() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: { userId: string; suspended: boolean; reason?: string }) => {
      const { data, error } = await supabase.rpc('set_user_suspension', {
        p_user_id: args.userId,
        p_suspended: args.suspended,
        p_reason: args.reason ?? null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      invalidateModeration(queryClient)
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

export function useAdminUpdateEmployer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      employerId: string
      canonicalName?: string
      website?: string | null
      country?: string
      state?: string | null
      city?: string | null
      description?: string | null
      status?: EmployerStatus
    }) => {
      const { data, error } = await supabase.rpc('update_employer', {
        p_employer_id: args.employerId,
        p_canonical_name: args.canonicalName ?? null,
        p_website: args.website ?? null,
        p_country: args.country ?? null,
        p_state: args.state ?? null,
        p_city: args.city ?? null,
        p_description: args.description ?? null,
        p_status: args.status ?? null,
      })
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['employer', variables.employerId] })
      void queryClient.invalidateQueries({ queryKey: ['employer-rankings'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-employers'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-audit'] })
    },
  })
}

export interface MergeResult {
  source_id: string
  target_id: string
  moved_employment_records: number
  moved_reviews: number
  moved_aliases: number
  discarded_conflict_count: number
}

export function useMergeEmployers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      sourceId: string
      targetId: string
      note?: string
    }): Promise<MergeResult> => {
      const { data, error } = await supabase.rpc('merge_employers', {
        p_source_id: args.sourceId,
        p_target_id: args.targetId,
        p_note: args.note ?? null,
      })
      if (error) throw error
      return data as unknown as MergeResult
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['employer'] })
      void queryClient.invalidateQueries({ queryKey: ['employer-rankings'] })
      void queryClient.invalidateQueries({ queryKey: ['employer-search'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-employers'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-audit'] })
      void queryClient.invalidateQueries({ queryKey: ['public-reviews'] })
    },
  })
}

export function useAddEmployerAlias() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: { employerId: string; alias: string }) => {
      const { data, error } = await supabase.rpc('add_employer_alias', {
        p_employer_id: args.employerId,
        p_alias: args.alias,
      })
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['employer-aliases', variables.employerId] })
      void queryClient.invalidateQueries({ queryKey: ['employer-search'] })
    },
  })
}

export function useAdminEmployers(search: string) {
  const trimmed = search.trim()
  return useQuery({
    queryKey: ['admin-employers', trimmed],
    staleTime: 15_000,
    queryFn: async () => {
      let query = supabase
        .from('employers')
        .select('id, canonical_name, country, state, city, status, created_at, merged_into_id')
        .order('created_at', { ascending: false })

      if (trimmed.length >= 2) {
        query = query.ilike('canonical_name', `%${trimmed}%`)
      }

      const { data, error } = await query.limit(100)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAdminUsers(search: string) {
  const trimmed = search.trim()
  return useQuery({
    queryKey: ['admin-users', trimmed],
    staleTime: 15_000,
    queryFn: async () => {
      // Staff can read profiles via RLS. Email is visible to staff for
      // account administration but is never rendered in public surfaces.
      let query = supabase
        .from('profiles')
        .select('id, display_name, full_name, is_suspended, suspended_at, suspension_reason, created_at')
        .order('created_at', { ascending: false })

      if (trimmed.length >= 2) {
        query = query.ilike('display_name', `%${trimmed}%`)
      }

      const { data, error } = await query.limit(100)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAuditLog(limit = 100) {
  return useQuery({
    queryKey: ['admin-audit', limit],
    staleTime: 15_000,
    queryFn: async (): Promise<ModerationAuditRow[]> => {
      const { data, error } = await supabase
        .from('moderation_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data ?? []
    },
  })
}
