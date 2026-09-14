import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { EmploymentRecordRow } from '@/lib/database.types'
import type { EmploymentRecordInput, ProfileInput } from '@/lib/validation'

export interface EmploymentRecordWithEmployer extends EmploymentRecordRow {
  employers: { id: string; canonical_name: string; city: string | null; country: string } | null
}

export function useMyEmploymentRecords(userId: string | null) {
  return useQuery({
    queryKey: ['employment-records', userId],
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async (): Promise<EmploymentRecordWithEmployer[]> => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('employment_records')
        .select('*, employers ( id, canonical_name, city, country )')
        .eq('user_id', userId)
        .order('start_year', { ascending: false })
        .order('start_month', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as EmploymentRecordWithEmployer[]
    },
  })
}

export function useMyEmploymentRecord(employerId: string | undefined, userId: string | null) {
  return useQuery({
    queryKey: ['employment-record', employerId, userId],
    enabled: Boolean(employerId && userId),
    staleTime: 60_000,
    queryFn: async (): Promise<EmploymentRecordRow | null> => {
      if (!employerId || !userId) return null
      const { data, error } = await supabase
        .from('employment_records')
        .select('*')
        .eq('employer_id', employerId)
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

function invalidateEmployment(
  queryClient: ReturnType<typeof useQueryClient>,
  employerId: string,
) {
  void queryClient.invalidateQueries({ queryKey: ['employment-records'] })
  void queryClient.invalidateQueries({ queryKey: ['employment-record', employerId] })
  void queryClient.invalidateQueries({ queryKey: ['employer-stats', employerId] })
  void queryClient.invalidateQueries({ queryKey: ['employer-rankings'] })
}

export function useUpsertEmploymentRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: {
      userId: string
      recordId?: string
      input: EmploymentRecordInput
    }): Promise<EmploymentRecordRow> => {
      const payload = {
        user_id: args.userId,
        employer_id: args.input.employer_id,
        status: args.input.status,
        start_month: args.input.start_month,
        start_year: args.input.start_year,
        end_month: args.input.status === 'former' ? (args.input.end_month ?? null) : null,
        end_year: args.input.status === 'former' ? (args.input.end_year ?? null) : null,
        job_title: args.input.job_title,
        project_client: args.input.project_client,
        location: args.input.location,
      }

      if (args.recordId) {
        const { data, error } = await supabase
          .from('employment_records')
          .update(payload)
          .eq('id', args.recordId)
          .select('*')
          .single()
        if (error) throw error
        return data
      }

      const { data, error } = await supabase
        .from('employment_records')
        .insert(payload)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => invalidateEmployment(queryClient, variables.input.employer_id),
  })
}

export function useDeleteEmploymentRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: { recordId: string; employerId: string }) => {
      // The review, if any, is removed by ON DELETE CASCADE. The UI warns
      // about this before calling.
      const { error } = await supabase
        .from('employment_records')
        .delete()
        .eq('id', args.recordId)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      invalidateEmployment(queryClient, variables.employerId)
      void queryClient.invalidateQueries({ queryKey: ['my-reviews'] })
      void queryClient.invalidateQueries({ queryKey: ['public-reviews', variables.employerId] })
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: { userId: string; input: ProfileInput }) => {
      // Only the columns in the authenticated role's UPDATE grant are
      // sent. `email`, `is_suspended` and friends are not writable here
      // by design — the grant would reject them anyway.
      const { data, error } = await supabase
        .from('profiles')
        .update({
          display_name: args.input.display_name,
          full_name: args.input.full_name,
          phone: args.input.phone,
          linkedin_url: args.input.linkedin_url,
          country: args.input.country,
          state: args.input.state,
          city: args.input.city,
        })
        .eq('id', args.userId)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['profile', variables.userId] })
    },
  })
}
