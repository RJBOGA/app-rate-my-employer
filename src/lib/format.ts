import { MONTHS } from './constants'
import type { EmploymentStatus } from './database.types'

const numberFormatter = new Intl.NumberFormat('en-US')

export function formatCount(value: number | null | undefined): string {
  return numberFormatter.format(value ?? 0)
}

/** "438 reviews" / "1 review" / "No reviews yet" */
export function formatReviewCount(count: number | null | undefined): string {
  const n = count ?? 0
  if (n === 0) return 'No reviews yet'
  return `${numberFormatter.format(n)} ${n === 1 ? 'review' : 'reviews'}`
}

/**
 * Ratings always render to one decimal — "4.0", never "4". A column of
 * ratings where some have decimals and some don't looks broken.
 */
export function formatRating(rating: number | null | undefined): string | null {
  if (rating === null || rating === undefined) return null
  return rating.toFixed(1)
}

/** "2 years 4 months" — the shape used next to a reviewer's byline. */
export function formatDuration(months: number | null | undefined): string | null {
  if (months === null || months === undefined || months < 0) return null
  if (months === 0) return 'Less than a month'

  const years = Math.floor(months / 12)
  const remainder = months % 12

  const parts: string[] = []
  if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`)
  if (remainder > 0) parts.push(`${remainder} ${remainder === 1 ? 'month' : 'months'}`)
  return parts.join(' ')
}

export function formatEmploymentStatus(status: EmploymentStatus | null | undefined): string {
  if (status === 'current') return 'Current employee'
  if (status === 'former') return 'Former employee'
  return 'Employee'
}

/** "March 2023" */
export function formatMonthYear(month: number | null, year: number | null): string | null {
  if (!month || !year) return null
  const name = MONTHS[month - 1]
  return name ? `${name} ${year}` : null
}

/** "March 2023 – May 2024" / "March 2023 – Present" */
export function formatEmploymentPeriod(record: {
  status: EmploymentStatus
  start_month: number
  start_year: number
  end_month: number | null
  end_year: number | null
}): string {
  const start = formatMonthYear(record.start_month, record.start_year) ?? '—'
  if (record.status === 'current') return `${start} – Present`
  const end = formatMonthYear(record.end_month, record.end_year) ?? '—'
  return `${start} – ${end}`
}

export function formatLocation(
  parts: { city?: string | null; state?: string | null; country?: string | null },
): string | null {
  const segments = [parts.city, parts.state, parts.country].filter(
    (p): p is string => typeof p === 'string' && p.trim().length > 0,
  )
  return segments.length > 0 ? segments.join(', ') : null
}

/** Whole percent, for the current/former employee split. */
export function formatPercent(part: number, total: number): string {
  if (total <= 0) return '—'
  return `${Math.round((part / total) * 100)}%`
}

const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''

  const diffSeconds = (then - Date.now()) / 1000
  const thresholds: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]

  for (const [unit, seconds] of thresholds) {
    const value = diffSeconds / seconds
    if (Math.abs(value) >= 1) {
      return relativeFormatter.format(Math.round(value), unit)
    }
  }
  return 'just now'
}

export function formatAbsoluteDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/** Strips the scheme so a website reads as a label, not a URL. */
export function formatWebsiteLabel(url: string | null | undefined): string | null {
  if (!url) return null
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
}

export function initialsFrom(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?'
}
