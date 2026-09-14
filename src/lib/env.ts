import { z } from 'zod'

/**
 * Environment is validated once, at module load, so a missing or
 * malformed key fails loudly at boot instead of surfacing as a confusing
 * 401 somewhere deep in a query.
 *
 * Only publishable values belong here. Anything prefixed VITE_ is
 * compiled into the browser bundle: the service-role key must never
 * appear in this file, this directory, or any .env the client reads.
 */
const schema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(20, 'VITE_SUPABASE_PUBLISHABLE_KEY looks too short to be valid'),
})

const parsed = schema.safeParse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
})

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.message}`).join('\n')
  throw new Error(
    `Supabase environment is not configured.\n${issues}\n\n` +
      `Copy .env.example to .env.local and fill in the values from your\n` +
      `Supabase project settings (Project Settings → API).`,
  )
}

/** Guard against someone pasting a secret key into the client env. */
if (/^sb_secret_/.test(parsed.data.VITE_SUPABASE_PUBLISHABLE_KEY)) {
  throw new Error(
    'VITE_SUPABASE_PUBLISHABLE_KEY holds a SECRET key. Secret / service-role ' +
      'keys bypass Row Level Security and must never reach the browser. Use the ' +
      'publishable (sb_publishable_...) key instead.',
  )
}

export const env = parsed.data
