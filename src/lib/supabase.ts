import { createClient } from '@supabase/supabase-js'
import { env } from './env'
import type { Database } from './database.types'

export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      headers: { 'x-application-name': 'rate-my-desi-employer' },
    },
  },
)
