import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Turns Postgres/PostgREST errors into something a person can act on.
 *
 * The database is the last line of defence and it speaks in SQLSTATE
 * codes. Surfacing "duplicate key value violates unique constraint
 * reviews_one_per_user_per_employer" to a user is a failure of craft;
 * surfacing "You have already reviewed this employer" is the same
 * information, usable.
 */

const CONSTRAINT_MESSAGES: Record<string, string> = {
  reviews_one_per_user_per_employer:
    'You have already reviewed this employer. You can edit your existing review instead.',
  employment_records_unique:
    'You have already added an employment record for this employer.',
  employers_normalized_name_key:
    'An employer with this name already exists.',
  employer_aliases_unique: 'That alternative name is already recorded for this employer.',
  reports_unique_reporter_review: 'You have already reported this review.',
  reports_unique_reporter_employer: 'You have already reported this employer.',
  reviews_title_len: 'The review title must be between 5 and 140 characters.',
  reviews_body_len: 'The review must be between 50 and 8,000 characters.',
  employment_end_after_start: 'The end date must be on or after the start date.',
  employment_end_fields_match_status:
    'Former employees must provide an end date; current employees must not.',
  profiles_linkedin_url_shape: 'Enter a valid LinkedIn profile URL.',
  employers_website_shape: 'Enter a valid website URL starting with http:// or https://.',
}

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    ('code' in error || 'details' in error)
  )
}

export function toUserMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (!error) return fallback

  if (isPostgrestError(error)) {
    // Named constraints first — they carry the most specific intent.
    const haystack = `${error.message} ${error.details ?? ''}`
    for (const [constraint, message] of Object.entries(CONSTRAINT_MESSAGES)) {
      if (haystack.includes(constraint)) return message
    }

    switch (error.code) {
      case '23505':
        return 'That record already exists.'
      case '23503':
        return 'The item you referenced no longer exists.'
      case '23514':
        // CHECK violations raised by our triggers carry a written message.
        return error.message.replace(/^.*violates check constraint.*$/i, 'That value is not valid.')
      case '42501':
        return error.message || 'You do not have permission to do that.'
      case 'PGRST301':
      case '401':
        return 'Your session has expired. Please sign in again.'
      case 'PGRST116':
        return 'Not found.'
      default:
        break
    }

    return error.message || fallback
  }

  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return fallback
}

/** Auth errors are their own dialect and benefit from friendlier copy. */
export function toAuthMessage(error: unknown): string {
  const raw = toUserMessage(error, 'Could not complete that request.')
  const lowered = raw.toLowerCase()

  if (lowered.includes('invalid login credentials')) {
    return 'That email and password combination is not correct.'
  }
  if (lowered.includes('email not confirmed')) {
    return 'Please confirm your email address first — check your inbox for the link.'
  }
  if (lowered.includes('user already registered')) {
    return 'An account already exists for this email. Try signing in instead.'
  }
  if (lowered.includes('rate limit') || lowered.includes('too many')) {
    return 'Too many attempts. Please wait a minute and try again.'
  }
  if (lowered.includes('password should be')) {
    return 'Password must be at least 8 characters.'
  }
  return raw
}

export class SuspendedAccountError extends Error {
  constructor() {
    super('Your account is suspended and cannot post content.')
    this.name = 'SuspendedAccountError'
  }
}
