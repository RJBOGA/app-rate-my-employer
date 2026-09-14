import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PublicReviewRow, ReviewRow } from '@/lib/database.types'
import type { ReviewInput } from '@/lib/validation'

export type ReviewSort = 'newest' | 'highest' | 'lowest'

/**
 * Public reviews for an employer.
 *
 * Reads `public_reviews`, never the `reviews` table. That view is the
 * privacy boundary: reviewer identity columns come back null unless the
 * author opted that specific field in, and email/phone are not present
 * in the projection at all.
 */
export function usePublicReviews(employerId: string | undefined, sort: ReviewSort = 'newest') {
  return useQuery({
    queryKey: ['public-reviews', employerId, sort],
    enabled: Boolean(employerId),
    staleTime: 30_000,
    queryFn: async (): Promise<PublicReviewRow[]> => {
      if (!employerId) return []

      let query = supabase.from('public_reviews').select('*').eq('employer_id', employerId)

      switch (sort) {
        case 'highest':
          query = query.order('overall_rating', { ascending: false }).order('created_at', {
            ascending: false,
          })
          break
        case 'lowest':
          query = query.order('overall_rating', { ascending: true }).order('created_at', {
            ascending: false,
          })
          break
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
      }

      const { data, error } = await query.limit(100)
      if (error) throw error
      return data ?? []
    },
  })
}

/** The caller's own review of an employer, if any. Read from the base
 *  table — RLS restricts it to rows they authored. */
export function useMyReview(employerId: string | undefined, userId: string | null) {
  return useQuery({
    queryKey: ['my-review', employerId, userId],
    enabled: Boolean(employerId && userId),
    staleTime: 30_000,
    queryFn: async (): Promise<ReviewRow | null> => {
      if (!employerId || !userId) return null
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('employer_id', employerId)
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export interface MyReviewWithEmployer extends ReviewRow {
  employers: { id: string; canonical_name: string; city: string | null; country: string } | null
}

export function useMyReviews(userId: string | null) {
  return useQuery({
    queryKey: ['my-reviews', userId],
    enabled: Boolean(userId),
    staleTime: 30_000,
    queryFn: async (): Promise<MyReviewWithEmployer[]> => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('reviews')
        .select('*, employers ( id, canonical_name, city, country )')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as MyReviewWithEmployer[]
    },
  })
}

function toReviewColumns(input: ReviewInput) {
  return {
    overall_rating: input.overall_rating,
    title: input.title,
    body: input.body,
    pros: input.pros,
    cons: input.cons,
    rating_pay: input.rating_pay,
    rating_communication: input.rating_communication,
    rating_job_stability: input.rating_job_stability,
    rating_project_quality: input.rating_project_quality,
    rating_visa_support: input.rating_visa_support,
    rating_transparency: input.rating_transparency,
    rating_management: input.rating_management,
    show_name: input.show_name,
    show_employment_duration: input.show_employment_duration,
    show_job_title: input.show_job_title,
    show_project_client: input.show_project_client,
    show_employment_location: input.show_employment_location,
    show_linkedin: input.show_linkedin,
  }
}

function invalidateReviewCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  employerId: string,
) {
  void queryClient.invalidateQueries({ queryKey: ['public-reviews', employerId] })
  void queryClient.invalidateQueries({ queryKey: ['employer-stats', employerId] })
  void queryClient.invalidateQueries({ queryKey: ['employer-rankings'] })
  void queryClient.invalidateQueries({ queryKey: ['my-review', employerId] })
  void queryClient.invalidateQueries({ queryKey: ['my-reviews'] })
}

export function useCreateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: {
      userId: string
      employerId: string
      employmentRecordId: string
      input: ReviewInput
    }): Promise<ReviewRow> => {
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: args.userId,
          employer_id: args.employerId,
          employment_record_id: args.employmentRecordId,
          acknowledged_at: new Date().toISOString(),
          ...toReviewColumns(args.input),
        })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => invalidateReviewCaches(queryClient, variables.employerId),
  })
}

export function useUpdateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: {
      reviewId: string
      employerId: string
      input: ReviewInput
    }): Promise<ReviewRow> => {
      // `status` is intentionally absent: the column is not in the
      // authenticated role's UPDATE grant, so an author cannot restore a
      // review an admin hid.
      const { data, error } = await supabase
        .from('reviews')
        .update({
          ...toReviewColumns(args.input),
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', args.reviewId)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => invalidateReviewCaches(queryClient, variables.employerId),
  })
}
