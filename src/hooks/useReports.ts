import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ReportTargetType } from '@/lib/database.types'
import type { ReportInput } from '@/lib/validation'

/**
 * Filing a report opens a moderation queue item. It never hides, edits
 * or deletes the reported content — only an explicit admin decision
 * changes a review's status.
 */
export function useReportContent() {
  return useMutation({
    mutationFn: async (args: {
      targetType: ReportTargetType
      targetId: string
      input: ReportInput
    }): Promise<string | null> => {
      const { data, error } = await supabase.rpc('report_content', {
        p_target_type: args.targetType,
        p_target_id: args.targetId,
        p_reason: args.input.reason,
        p_details: args.input.details,
      })
      if (error) throw error
      // Null means the caller already has an open report on this target.
      // Treated as success so the UI does not reveal prior report state.
      return data
    },
  })
}
