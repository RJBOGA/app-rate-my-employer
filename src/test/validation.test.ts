import { describe, expect, it } from 'vitest'
import {
  employerSchema,
  employmentRecordSchema,
  fieldErrors,
  profileSchema,
  reviewSchema,
  signUpSchema,
} from '@/lib/validation'
import { DEFAULT_PRIVACY_FLAGS } from '@/lib/validation'

const validReview = {
  overall_rating: 4,
  title: 'Solid place to start',
  body: 'A'.repeat(80),
  pros: 'Good onboarding',
  cons: '',
  rating_pay: 3,
  rating_communication: 4,
  rating_job_stability: 5,
  rating_project_quality: 4,
  rating_visa_support: 4,
  rating_transparency: 3,
  rating_management: 4,
  ...DEFAULT_PRIVACY_FLAGS,
  acknowledged: true as const,
}

describe('reviewSchema', () => {
  it('accepts a complete review', () => {
    expect(reviewSchema.safeParse(validReview).success).toBe(true)
  })

  it('rejects an unrated category (0 encodes "unrated")', () => {
    const r = reviewSchema.safeParse({ ...validReview, rating_visa_support: 0 })
    expect(r.success).toBe(false)
    if (!r.success) expect(fieldErrors(r.error)).toHaveProperty('rating_visa_support')
  })

  it('rejects ratings outside 1–5', () => {
    expect(reviewSchema.safeParse({ ...validReview, overall_rating: 6 }).success).toBe(false)
  })

  it('requires a 50-character body', () => {
    const r = reviewSchema.safeParse({ ...validReview, body: 'too short' })
    expect(r.success).toBe(false)
    if (!r.success) expect(fieldErrors(r.error)['body']).toMatch(/50/)
  })

  it('normalises empty optional text to null', () => {
    const r = reviewSchema.safeParse({ ...validReview, cons: '   ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.cons).toBeNull()
  })
})

describe('employmentRecordSchema', () => {
  const base = {
    employer_id: '11111111-1111-4111-8111-111111111111',
    status: 'current' as const,
    start_month: 3,
    start_year: 2023,
    end_month: null,
    end_year: null,
    job_title: 'Engineer',
    project_client: '',
    location: '',
  }

  it('accepts a current employee without an end date', () => {
    expect(employmentRecordSchema.safeParse(base).success).toBe(true)
  })

  it('requires an end date for former employees', () => {
    const r = employmentRecordSchema.safeParse({ ...base, status: 'former' })
    expect(r.success).toBe(false)
    if (!r.success) {
      const e = fieldErrors(r.error)
      expect(e['end_month'] ?? e['end_year']).toBeDefined()
    }
  })

  it('rejects an end date before the start date', () => {
    const r = employmentRecordSchema.safeParse({
      ...base,
      status: 'former',
      end_month: 1,
      end_year: 2022,
    })
    expect(r.success).toBe(false)
    if (!r.success) expect(fieldErrors(r.error)['end_month']).toMatch(/on or after/)
  })

  it('rejects a start date in the future', () => {
    const r = employmentRecordSchema.safeParse({ ...base, start_year: new Date().getFullYear() + 1 })
    expect(r.success).toBe(false)
  })

  it('rejects an end date on a current record', () => {
    const r = employmentRecordSchema.safeParse({ ...base, end_month: 5, end_year: 2024 })
    expect(r.success).toBe(false)
  })
})

describe('employerSchema', () => {
  it('requires a name with at least one alphanumeric', () => {
    expect(employerSchema.safeParse({ canonical_name: '---', country: 'US' }).success).toBe(false)
  })

  it('validates website shape', () => {
    expect(
      employerSchema.safeParse({ canonical_name: 'Acme', country: 'US', website: 'acme.com' }).success,
    ).toBe(false)
    expect(
      employerSchema.safeParse({ canonical_name: 'Acme', country: 'US', website: 'https://acme.com' })
        .success,
    ).toBe(true)
  })
})

describe('profileSchema', () => {
  it('only accepts LinkedIn URLs for linkedin_url', () => {
    expect(
      profileSchema.safeParse({ display_name: 'A', linkedin_url: 'https://twitter.com/a' }).success,
    ).toBe(false)
    expect(
      profileSchema.safeParse({ display_name: 'A', linkedin_url: 'https://www.linkedin.com/in/a' })
        .success,
    ).toBe(true)
  })
})

describe('signUpSchema', () => {
  it('requires matching passwords and attaches the error to confirmPassword', () => {
    const r = signUpSchema.safeParse({
      email: 'a@b.co',
      password: 'longenough1',
      confirmPassword: 'different1',
      displayName: 'A',
    })
    expect(r.success).toBe(false)
    if (!r.success) expect(fieldErrors(r.error)).toHaveProperty('confirmPassword')
  })
})
