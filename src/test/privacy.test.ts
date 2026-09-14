import { describe, expect, expectTypeOf, it } from 'vitest'
import type { PublicReviewRow } from '@/lib/database.types'
import { PRIVACY_FIELDS } from '@/lib/constants'
import { DEFAULT_PRIVACY_FLAGS, reviewSchema } from '@/lib/validation'

/**
 * These tests encode the product's privacy invariants at the type and
 * schema level, so a future change that widens the public projection or
 * flips a default fails CI before it reaches a browser.
 */
describe('privacy boundary', () => {
  it('public review projection has no email, phone or user_id', () => {
    expectTypeOf<PublicReviewRow>().not.toHaveProperty('email')
    expectTypeOf<PublicReviewRow>().not.toHaveProperty('phone')
    expectTypeOf<PublicReviewRow>().not.toHaveProperty('user_id')
    expectTypeOf<PublicReviewRow>().not.toHaveProperty('employment_record_id')
  })

  it('reviewer identity fields on the projection are nullable (anonymous by default)', () => {
    expectTypeOf<PublicReviewRow['reviewer_name']>().toEqualTypeOf<string | null>()
    expectTypeOf<PublicReviewRow['job_title']>().toEqualTypeOf<string | null>()
    expectTypeOf<PublicReviewRow['linkedin_url']>().toEqualTypeOf<string | null>()
  })

  it('email and phone are not offerable as public fields', () => {
    const keys = PRIVACY_FIELDS.map((f) => f.key as string)
    expect(keys.some((k) => /email|phone/i.test(k))).toBe(false)
    const labels = PRIVACY_FIELDS.map((f) => f.label.toLowerCase())
    expect(labels.some((l) => /email|phone/.test(l))).toBe(false)
  })

  it('every privacy flag defaults to false', () => {
    expect(Object.values(DEFAULT_PRIVACY_FLAGS).every((v) => v === false)).toBe(true)
    // and the flag set matches the offerable fields exactly
    expect(Object.keys(DEFAULT_PRIVACY_FLAGS).sort()).toEqual(
      PRIVACY_FIELDS.map((f) => f.key).sort(),
    )
  })

  it('review schema requires explicit acknowledgement', () => {
    const base = {
      overall_rating: 4,
      title: 'A reasonable title',
      body: 'x'.repeat(60),
      pros: '',
      cons: '',
      rating_pay: 4,
      rating_communication: 4,
      rating_job_stability: 4,
      rating_project_quality: 4,
      rating_visa_support: 4,
      rating_transparency: 4,
      rating_management: 4,
      ...DEFAULT_PRIVACY_FLAGS,
    }
    expect(reviewSchema.safeParse({ ...base, acknowledged: false }).success).toBe(false)
    expect(reviewSchema.safeParse({ ...base, acknowledged: true }).success).toBe(true)
  })
})
