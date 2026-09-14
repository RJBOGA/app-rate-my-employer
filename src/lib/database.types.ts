/**
 * Generated from the live Supabase schema.
 *
 * Regenerate with:
 *   supabase gen types typescript --project-id ccdtebczdoaanpcpwklx > src/lib/database.types.ts
 *
 * Note what `public_reviews` does NOT contain: `email`, `phone`, `user_id`.
 * That absence is the privacy boundary, enforced in SQL. If a future schema
 * change makes those appear here, it is a regression, not a feature — see
 * src/test/privacy.test.ts, which asserts against this type.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type EmployerStatus = 'active' | 'merged' | 'hidden' | 'removed'
export type EmploymentStatus = 'current' | 'former'
export type ReportStatus = 'open' | 'under_review' | 'resolved' | 'dismissed'
export type ReportTargetType = 'review' | 'employer'
export type ReviewStatus = 'published' | 'hidden' | 'removed'

export type ProfileRow = {
  id: string
  display_name: string | null
  full_name: string | null
  /** Private. Readable only by the owner via RLS; never in a public projection. */
  email: string | null
  /** Private. Readable only by the owner via RLS; never in a public projection. */
  phone: string | null
  linkedin_url: string | null
  country: string | null
  state: string | null
  city: string | null
  is_suspended: boolean
  suspended_at: string | null
  suspension_reason: string | null
  created_at: string
  updated_at: string
}

export type EmployerRow = {
  id: string
  canonical_name: string
  normalized_name: string | null
  website: string | null
  country: string
  state: string | null
  city: string | null
  description: string | null
  status: EmployerStatus
  merged_into_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type EmployerAliasRow = {
  id: string
  employer_id: string
  alias: string
  normalized_alias: string | null
  source: 'user' | 'admin' | 'merge'
  created_by: string | null
  created_at: string
}

export type EmploymentRecordRow = {
  id: string
  user_id: string
  employer_id: string
  status: EmploymentStatus
  start_month: number
  start_year: number
  end_month: number | null
  end_year: number | null
  job_title: string
  project_client: string | null
  location: string | null
  created_at: string
  updated_at: string
}

export type ReviewRow = {
  id: string
  user_id: string
  employer_id: string
  employment_record_id: string
  overall_rating: number
  title: string
  body: string
  pros: string | null
  cons: string | null
  rating_pay: number
  rating_communication: number
  rating_job_stability: number
  rating_project_quality: number
  rating_visa_support: number
  rating_transparency: number
  rating_management: number
  show_name: boolean
  show_employment_duration: boolean
  show_job_title: boolean
  show_project_client: boolean
  show_employment_location: boolean
  show_linkedin: boolean
  acknowledged_at: string
  status: ReviewStatus
  created_at: string
  updated_at: string
}

export type ReportRow = {
  id: string
  reporter_id: string
  target_type: ReportTargetType
  review_id: string | null
  employer_id: string | null
  reason: string
  details: string | null
  status: ReportStatus
  resolved_by: string | null
  resolved_at: string | null
  resolution_note: string | null
  created_at: string
  updated_at: string
}

export type UserRoleRow = {
  user_id: string
  role: 'admin' | 'moderator'
  granted_by: string | null
  granted_at: string
}

export type ModerationAuditRow = {
  id: number
  actor_id: string | null
  action: string
  target_type: string
  target_id: string | null
  before: Json | null
  after: Json | null
  note: string | null
  created_at: string
}

/** The public projection of a review. Reviewer identity fields are null
 *  unless the author explicitly opted that field in. */
export type PublicReviewRow = {
  id: string | null
  employer_id: string | null
  overall_rating: number | null
  title: string | null
  body: string | null
  pros: string | null
  cons: string | null
  rating_pay: number | null
  rating_communication: number | null
  rating_job_stability: number | null
  rating_project_quality: number | null
  rating_visa_support: number | null
  rating_transparency: number | null
  rating_management: number | null
  created_at: string | null
  updated_at: string | null
  employment_status: EmploymentStatus | null
  reviewer_name: string | null
  employment_duration_months: number | null
  job_title: string | null
  project_client: string | null
  employment_location: string | null
  linkedin_url: string | null
}

export type EmployerStatsRow = {
  employer_id: string | null
  review_count: number | null
  rating_sum: number | null
  avg_rating: number | null
  avg_pay: number | null
  avg_communication: number | null
  avg_job_stability: number | null
  avg_project_quality: number | null
  avg_visa_support: number | null
  avg_transparency: number | null
  avg_management: number | null
  last_review_at: string | null
  employee_count: number | null
  current_employee_count: number | null
  former_employee_count: number | null
}

export type EmployerRankingRow = {
  id: string | null
  canonical_name: string | null
  website: string | null
  country: string | null
  state: string | null
  city: string | null
  description: string | null
  created_at: string | null
  review_count: number | null
  avg_rating: number | null
  employee_count: number | null
  current_employee_count: number | null
  former_employee_count: number | null
  last_review_at: string | null
  /** Bayesian-shrunk sort key. Never rendered. */
  weighted_score: number | null
}

export type EmployerSearchResult = {
  id: string
  canonical_name: string
  country: string
  state: string | null
  city: string | null
  review_count: number
  avg_rating: number | null
  matched_alias: string | null
  similarity_score: number
}

export type Database = {
  // supabase-js keys its client generics off this marker; without it the
  // Tables/Functions lookups silently resolve to `never`.
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Partial<ProfileRow> & { id: string }
        Update: Partial<ProfileRow>
        Relationships: []
      }
      employers: {
        Row: EmployerRow
        Insert: Partial<EmployerRow> & { canonical_name: string; country: string }
        Update: Partial<EmployerRow>
        Relationships: []
      }
      employer_aliases: {
        Row: EmployerAliasRow
        Insert: Partial<EmployerAliasRow> & { employer_id: string; alias: string }
        Update: Partial<EmployerAliasRow>
        Relationships: []
      }
      employment_records: {
        Row: EmploymentRecordRow
        Insert: Omit<EmploymentRecordRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
        }
        Update: Partial<EmploymentRecordRow>
        Relationships: []
      }
      reviews: {
        Row: ReviewRow
        Insert: Omit<ReviewRow, 'id' | 'created_at' | 'updated_at' | 'status'> & {
          id?: string
          status?: ReviewStatus
        }
        Update: Partial<ReviewRow>
        Relationships: []
      }
      reports: {
        Row: ReportRow
        Insert: Partial<ReportRow> & {
          reporter_id: string
          target_type: ReportTargetType
          reason: string
        }
        Update: Partial<ReportRow>
        Relationships: []
      }
      user_roles: {
        Row: UserRoleRow
        Insert: UserRoleRow
        Update: Partial<UserRoleRow>
        Relationships: []
      }
      moderation_audit_log: {
        Row: ModerationAuditRow
        Insert: Omit<ModerationAuditRow, 'id' | 'created_at'>
        // The table is append-only in the database (no UPDATE/DELETE
        // policy exists). This stays a real object type because
        // supabase-js requires every table to be structurally valid —
        // `never` here silently collapses the whole schema to `never`.
        Update: Partial<ModerationAuditRow>
        Relationships: []
      }
      app_config: {
        Row: { key: string; value: Json; description: string | null; updated_at: string }
        Insert: { key: string; value: Json; description?: string | null }
        Update: Partial<{ key: string; value: Json; description: string | null }>
        Relationships: []
      }
    }
    Views: {
      public_reviews: { Row: PublicReviewRow; Relationships: [] }
      employer_stats: { Row: EmployerStatsRow; Relationships: [] }
      employer_rankings: { Row: EmployerRankingRow; Relationships: [] }
    }
    Functions: {
      search_employers: {
        Args: { p_query: string; p_limit?: number }
        Returns: EmployerSearchResult[]
      }
      create_employer: {
        Args: {
          p_canonical_name: string
          p_country: string
          p_state?: string | null
          p_city?: string | null
          p_website?: string | null
          p_description?: string | null
          p_confirm_similar?: boolean
        }
        Returns: Json
      }
      report_content: {
        Args: {
          p_target_type: ReportTargetType
          p_target_id: string
          p_reason: string
          p_details?: string | null
        }
        Returns: string
      }
      set_review_status: {
        Args: { p_review_id: string; p_status: ReviewStatus; p_note?: string | null }
        Returns: Json
      }
      set_user_suspension: {
        Args: { p_user_id: string; p_suspended: boolean; p_reason?: string | null }
        Returns: Json
      }
      resolve_report: {
        Args: { p_report_id: string; p_status: ReportStatus; p_note?: string | null }
        Returns: Json
      }
      update_employer: {
        Args: {
          p_employer_id: string
          p_canonical_name?: string | null
          p_website?: string | null
          p_country?: string | null
          p_state?: string | null
          p_city?: string | null
          p_description?: string | null
          p_status?: EmployerStatus | null
        }
        Returns: Json
      }
      merge_employers: {
        Args: { p_source_id: string; p_target_id: string; p_note?: string | null }
        Returns: Json
      }
      add_employer_alias: {
        Args: { p_employer_id: string; p_alias: string }
        Returns: Json
      }
      is_admin: { Args: { uid?: string }; Returns: boolean }
      is_staff: { Args: { uid?: string }; Returns: boolean }
      is_suspended: { Args: { uid?: string }; Returns: boolean }
    }
    Enums: {
      employer_status: EmployerStatus
      employment_status: EmploymentStatus
      report_status: ReportStatus
      report_target_type: ReportTargetType
      review_status: ReviewStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
