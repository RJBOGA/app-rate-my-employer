import { describe, expect, it } from 'vitest'
import {
  formatDuration,
  formatEmploymentPeriod,
  formatLocation,
  formatPercent,
  formatRating,
  formatReviewCount,
  formatWebsiteLabel,
} from '@/lib/format'
import { toUserMessage } from '@/lib/errors'

describe('format helpers', () => {
  it('formatDuration', () => {
    expect(formatDuration(28)).toBe('2 years 4 months')
    expect(formatDuration(12)).toBe('1 year')
    expect(formatDuration(1)).toBe('1 month')
    expect(formatDuration(0)).toBe('Less than a month')
    expect(formatDuration(null)).toBeNull()
  })

  it('formatRating always shows one decimal', () => {
    expect(formatRating(4)).toBe('4.0')
    expect(formatRating(4.25)).toBe('4.3')
    expect(formatRating(null)).toBeNull()
  })

  it('formatReviewCount pluralises', () => {
    expect(formatReviewCount(0)).toBe('No reviews yet')
    expect(formatReviewCount(1)).toBe('1 review')
    expect(formatReviewCount(438)).toBe('438 reviews')
    expect(formatReviewCount(1245)).toBe('1,245 reviews')
  })

  it('formatPercent', () => {
    expect(formatPercent(68, 100)).toBe('68%')
    expect(formatPercent(1, 3)).toBe('33%')
    expect(formatPercent(0, 0)).toBe('—')
  })

  it('formatLocation skips blanks', () => {
    expect(formatLocation({ city: 'Edison', state: null, country: 'US' })).toBe('Edison, US')
    expect(formatLocation({})).toBeNull()
  })

  it('formatEmploymentPeriod', () => {
    expect(
      formatEmploymentPeriod({
        status: 'current',
        start_month: 3,
        start_year: 2023,
        end_month: null,
        end_year: null,
      }),
    ).toBe('March 2023 – Present')
    expect(
      formatEmploymentPeriod({
        status: 'former',
        start_month: 1,
        start_year: 2021,
        end_month: 5,
        end_year: 2023,
      }),
    ).toBe('January 2021 – May 2023')
  })

  it('formatWebsiteLabel strips scheme and trailing slash', () => {
    expect(formatWebsiteLabel('https://www.tcs.com/')).toBe('www.tcs.com')
  })
})

describe('toUserMessage', () => {
  it('translates the one-review constraint', () => {
    const msg = toUserMessage({
      code: '23505',
      message: 'duplicate key value violates unique constraint "reviews_one_per_user_per_employer"',
      details: '',
      hint: '',
      name: 'PostgrestError',
    })
    expect(msg).toMatch(/already reviewed/)
  })

  it('falls back sensibly', () => {
    expect(toUserMessage(new Error('boom'))).toBe('boom')
    expect(toUserMessage(null, 'fallback')).toBe('fallback')
  })
})
