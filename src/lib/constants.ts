import type { ReportTargetType } from './database.types'

/**
 * The seven supporting category ratings, in the order they appear
 * everywhere in the product. One source of truth: the review form, the
 * employer profile breakdown and the tests all iterate this array, so a
 * category can never be rendered in one place and missed in another.
 */
export const RATING_CATEGORIES = [
  {
    key: 'rating_pay',
    label: 'Pay / Compensation',
    help: 'Salary, raises, bonuses and whether pay arrived on time.',
  },
  {
    key: 'rating_communication',
    label: 'Communication',
    help: 'How clearly and promptly the employer communicates with you.',
  },
  {
    key: 'rating_job_stability',
    label: 'Job Stability',
    help: 'Bench time, layoffs and how secure the role felt.',
  },
  {
    key: 'rating_project_quality',
    label: 'Project Quality',
    help: 'The technical substance and career value of the work.',
  },
  {
    key: 'rating_visa_support',
    label: 'Visa / Immigration Support',
    help: 'Handling of petitions, transfers, timelines and associated costs.',
  },
  {
    key: 'rating_transparency',
    label: 'Transparency',
    help: 'Honesty about rates, clients, contracts and expectations.',
  },
  {
    key: 'rating_management',
    label: 'Management',
    help: 'Competence and fairness of the people you reported to.',
  },
] as const

export type RatingCategoryKey = (typeof RATING_CATEGORIES)[number]['key']

/**
 * The reviewer-identity fields a user may choose to publish.
 *
 * Email and phone are deliberately absent and must stay absent — they are
 * not "default off", they are not offerable at all. The database view that
 * serves public reviews does not select those columns.
 */
export const PRIVACY_FIELDS = [
  {
    key: 'show_name',
    label: 'Display name',
    description: 'Shows your profile display name, e.g. “Raju B.”, instead of “Anonymous”.',
  },
  {
    key: 'show_employment_duration',
    label: 'Employment duration',
    description: 'Shows how long you worked there, e.g. “2 years 4 months”.',
  },
  {
    key: 'show_job_title',
    label: 'Job title',
    description: 'Shows the title from your employment record, e.g. “Software Engineer”.',
  },
  {
    key: 'show_project_client',
    label: 'Project / client',
    description: 'Shows the project or end client you were placed on.',
  },
  {
    key: 'show_employment_location',
    label: 'Employment location',
    description: 'Shows the city or site where you worked.',
  },
  {
    key: 'show_linkedin',
    label: 'LinkedIn profile',
    description: 'Links your LinkedIn profile from this review.',
  },
] as const

export type PrivacyFieldKey = (typeof PRIVACY_FIELDS)[number]['key']

export const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'personal_information', label: 'Personal information about an individual' },
  { value: 'confidential_information', label: 'Confidential company information' },
  { value: 'false_information', label: 'False or misleading content' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'other', label: 'Something else' },
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]['value']

export const REPORT_TARGET_LABEL: Record<ReportTargetType, string> = {
  review: 'review',
  employer: 'employer',
}

/** Shown before every review submission, and acknowledged explicitly. */
export const REVIEW_SAFETY_NOTICE =
  'Share your personal employment experience. Do not post confidential company ' +
  'information, personal information about individuals, threats, or unsupported ' +
  'allegations.'

/**
 * "Highest Rated" needs a floor. Without one, an employer with zero
 * reviews scores exactly the global mean and lands mid-table ahead of
 * real employers that have been rated slightly below average — which
 * reads as a bug to anyone looking at the list.
 */
export const MIN_REVIEWS_FOR_RATING_RANK = 3

export const RANKING_TABS = [
  { value: 'highest_rated', label: 'Highest Rated' },
  { value: 'most_reviewed', label: 'Most Reviewed' },
  { value: 'most_employees', label: 'Most Employees' },
  { value: 'newest', label: 'Newest' },
] as const

export type RankingTab = (typeof RANKING_TABS)[number]['value']

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const
