import { z } from 'zod'

/**
 * Client-side schemas.
 *
 * These mirror the database CHECK constraints deliberately — same
 * bounds, same rules. They exist to give fast, field-level feedback, NOT
 * to be the enforcement point: every one of these rules is independently
 * enforced in Postgres, and the server is what actually decides. If the
 * two ever disagree, the database wins and errors.ts translates the
 * rejection into readable copy.
 */

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Enter a valid email address')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be 72 characters or fewer')

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})
export type SignInInput = z.infer<typeof signInSchema>

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
    displayName: z
      .string()
      .trim()
      .min(1, 'Choose a display name')
      .max(80, 'Display name must be 80 characters or fewer'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
export type SignUpInput = z.infer<typeof signUpSchema>

export const resetRequestSchema = z.object({ email: emailSchema })
export type ResetRequestInput = z.infer<typeof resetRequestSchema>

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>

const optionalTrimmed = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null))

export const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, 'Display name is required')
    .max(80, 'Display name must be 80 characters or fewer'),
  full_name: optionalTrimmed(120, 'Full name must be 120 characters or fewer'),
  /** Private field. Stored, never published. */
  phone: optionalTrimmed(40, 'Phone number must be 40 characters or fewer'),
  linkedin_url: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null))
    .refine(
      (v) => v === null || /^https?:\/\/([a-z0-9-]+\.)*linkedin\.com\/.+/i.test(v),
      'Enter a valid LinkedIn profile URL (https://www.linkedin.com/in/…)',
    ),
  country: optionalTrimmed(80, 'Country must be 80 characters or fewer'),
  state: optionalTrimmed(80, 'State must be 80 characters or fewer'),
  city: optionalTrimmed(80, 'City must be 80 characters or fewer'),
})
export type ProfileInput = z.infer<typeof profileSchema>

export const employerSchema = z.object({
  canonical_name: z
    .string()
    .trim()
    .min(2, 'Employer name must be at least 2 characters')
    .max(160, 'Employer name must be 160 characters or fewer')
    .refine(
      (v) => /[a-z0-9]/i.test(v),
      'Employer name must contain at least one letter or number',
    ),
  country: z.string().trim().min(1, 'Country is required').max(80),
  state: optionalTrimmed(80, 'State must be 80 characters or fewer'),
  city: optionalTrimmed(80, 'City must be 80 characters or fewer'),
  website: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null))
    .refine(
      (v) => v === null || /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(v),
      'Enter a valid URL starting with http:// or https://',
    ),
  description: optionalTrimmed(2000, 'Description must be 2,000 characters or fewer'),
})
export type EmployerInput = z.infer<typeof employerSchema>

const monthSchema = z
  .number({ message: 'Select a month' })
  .int()
  .min(1, 'Select a month')
  .max(12, 'Select a month')

const yearSchema = z
  .number({ message: 'Select a year' })
  .int()
  .min(1950, 'Year must be 1950 or later')
  .max(currentYear, 'Year cannot be in the future')

export const employmentRecordSchema = z
  .object({
    employer_id: z.string().uuid('Select an employer'),
    status: z.enum(['current', 'former'], { message: 'Select your employment status' }),
    start_month: monthSchema,
    start_year: yearSchema,
    end_month: monthSchema.nullable().optional(),
    end_year: yearSchema.nullable().optional(),
    job_title: z
      .string()
      .trim()
      .min(2, 'Job title must be at least 2 characters')
      .max(120, 'Job title must be 120 characters or fewer'),
    project_client: optionalTrimmed(120, 'Project or client must be 120 characters or fewer'),
    location: optionalTrimmed(120, 'Location must be 120 characters or fewer'),
  })
  .superRefine((data, ctx) => {
    const startIndex = data.start_year * 12 + data.start_month
    const nowIndex = currentYear * 12 + currentMonth

    if (startIndex > nowIndex) {
      ctx.addIssue({
        code: 'custom',
        path: ['start_month'],
        message: 'Start date cannot be in the future',
      })
    }

    if (data.status === 'former') {
      if (!data.end_month) {
        ctx.addIssue({ code: 'custom', path: ['end_month'], message: 'Select an end month' })
      }
      if (!data.end_year) {
        ctx.addIssue({ code: 'custom', path: ['end_year'], message: 'Select an end year' })
      }
      if (data.end_month && data.end_year) {
        const endIndex = data.end_year * 12 + data.end_month
        if (endIndex > nowIndex) {
          ctx.addIssue({
            code: 'custom',
            path: ['end_month'],
            message: 'End date cannot be in the future',
          })
        }
        if (endIndex < startIndex) {
          ctx.addIssue({
            code: 'custom',
            path: ['end_month'],
            message: 'End date must be on or after the start date',
          })
        }
      }
    } else {
      if (data.end_month || data.end_year) {
        ctx.addIssue({
          code: 'custom',
          path: ['end_month'],
          message: 'Current employees should not have an end date',
        })
      }
    }
  })
export type EmploymentRecordInput = z.infer<typeof employmentRecordSchema>

const ratingSchema = z
  .number({ message: 'Select a rating' })
  .int()
  .min(1, 'Select a rating from 1 to 5')
  .max(5, 'Select a rating from 1 to 5')

export const reviewSchema = z.object({
  overall_rating: ratingSchema,
  title: z
    .string()
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(140, 'Title must be 140 characters or fewer'),
  body: z
    .string()
    .trim()
    .min(50, 'Please write at least 50 characters so the review is useful to others')
    .max(8000, 'Review must be 8,000 characters or fewer'),
  pros: optionalTrimmed(2000, 'Pros must be 2,000 characters or fewer'),
  cons: optionalTrimmed(2000, 'Cons must be 2,000 characters or fewer'),

  rating_pay: ratingSchema,
  rating_communication: ratingSchema,
  rating_job_stability: ratingSchema,
  rating_project_quality: ratingSchema,
  rating_visa_support: ratingSchema,
  rating_transparency: ratingSchema,
  rating_management: ratingSchema,

  show_name: z.boolean(),
  show_employment_duration: z.boolean(),
  show_job_title: z.boolean(),
  show_project_client: z.boolean(),
  show_employment_location: z.boolean(),
  show_linkedin: z.boolean(),

  acknowledged: z.literal(true, {
    message: 'Please confirm this review reflects your personal experience',
  }),
})
export type ReviewInput = z.infer<typeof reviewSchema>

/** Every privacy flag starts off. Anonymity is the state you begin in. */
export const DEFAULT_PRIVACY_FLAGS = {
  show_name: false,
  show_employment_duration: false,
  show_job_title: false,
  show_project_client: false,
  show_employment_location: false,
  show_linkedin: false,
} as const

export const reportSchema = z.object({
  reason: z.enum(
    [
      'spam',
      'harassment',
      'personal_information',
      'confidential_information',
      'false_information',
      'inappropriate_content',
      'other',
    ],
    { message: 'Select a reason' },
  ),
  details: optionalTrimmed(2000, 'Details must be 2,000 characters or fewer'),
})
export type ReportInput = z.infer<typeof reportSchema>

/** Collapses a ZodError into `{ fieldName: firstMessage }` for form state. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form'
    if (!(key in out)) out[key] = issue.message
  }
  return out
}
