/**
 * Development seed.
 *
 *   SEED_ENV=development \
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<secret> \
 *   node --experimental-strip-types scripts/seed-dev.ts
 *
 * Refuses to run unless SEED_ENV is literally "development". The service
 * role key bypasses RLS, so this script must never be wired into a build,
 * a deploy, or anything that reads .env.local (which holds only the
 * publishable key). Nothing here is production data: every user has an
 * @seed.invalid email and every employer name starts with "[Seed]", so
 * the whole set can be found and removed with two DELETEs (see --reset).
 */

import { createClient } from '@supabase/supabase-js'

const env = process.env
if (env.SEED_ENV !== 'development') {
  console.error('Refusing to seed: SEED_ENV must be exactly "development".')
  process.exit(1)
}
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
  process.exit(1)
}
if (!/^sb_secret_|^eyJ/.test(env.SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('SUPABASE_SERVICE_ROLE_KEY does not look like a service-role key.')
  process.exit(1)
}

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SEED_PASSWORD = 'seed-password-1234'
const SEED_DOMAIN = 'seed.invalid'
const SEED_PREFIX = '[Seed] '

interface SeedUser {
  email: string
  display_name: string
  linkedin?: string
}

const USERS: SeedUser[] = [
  { email: `asha@${SEED_DOMAIN}`, display_name: 'Asha K.' },
  { email: `raju@${SEED_DOMAIN}`, display_name: 'Raju B.', linkedin: 'https://www.linkedin.com/in/raju-seed' },
  { email: `meera@${SEED_DOMAIN}`, display_name: 'Meera S.' },
  { email: `vikram@${SEED_DOMAIN}`, display_name: 'Vikram P.' },
  { email: `priya@${SEED_DOMAIN}`, display_name: 'Priya N.' },
  { email: `admin@${SEED_DOMAIN}`, display_name: 'Seed Admin' },
]

const EMPLOYERS = [
  { name: `${SEED_PREFIX}Tata Consultancy Services`, country: 'India', state: 'Maharashtra', city: 'Mumbai', aliases: ['TCS'] },
  { name: `${SEED_PREFIX}Infosys`, country: 'India', state: 'Karnataka', city: 'Bengaluru', aliases: [] },
  { name: `${SEED_PREFIX}Cognizant`, country: 'United States', state: 'New Jersey', city: 'Teaneck', aliases: ['CTS'] },
  { name: `${SEED_PREFIX}Sunrise IT Staffing LLC`, country: 'United States', state: 'Texas', city: 'Plano', aliases: [] },
  { name: `${SEED_PREFIX}Everest Tech Consultants`, country: 'United States', state: 'New Jersey', city: 'Edison', aliases: [] },
]

const BODY =
  'Seed review. The onboarding was thorough and the first project was a genuine enterprise system, ' +
  'but bench periods were longer than promised and communication about allocation lagged. ' +
  'Immigration paperwork was handled on time. This text exists only to satisfy the minimum length.'

async function reset() {
  console.log('Removing seed data…')
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 })
  for (const u of users?.users ?? []) {
    if (u.email?.endsWith(`@${SEED_DOMAIN}`)) await admin.auth.admin.deleteUser(u.id)
  }
  await admin.from('employers').delete().like('canonical_name', `${SEED_PREFIX}%`)
  console.log('Done.')
}

async function seed() {
  console.log('Creating seed users…')
  const userIds = new Map<string, string>()
  for (const u of USERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: SEED_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: u.display_name },
    })
    if (error) throw error
    userIds.set(u.email, data.user.id)
    if (u.linkedin) {
      await admin.from('profiles').update({ linkedin_url: u.linkedin }).eq('id', data.user.id)
    }
  }

  const adminId = userIds.get(`admin@${SEED_DOMAIN}`)!
  await admin.from('user_roles').insert({ user_id: adminId, role: 'admin' })

  console.log('Creating seed employers…')
  const employerIds: string[] = []
  for (const e of EMPLOYERS) {
    const { data, error } = await admin
      .from('employers')
      .insert({ canonical_name: e.name, country: e.country, state: e.state, city: e.city })
      .select('id')
      .single()
    if (error) throw error
    employerIds.push(data.id)
    for (const alias of e.aliases) {
      await admin.from('employer_aliases').insert({ employer_id: data.id, alias, source: 'admin' })
    }
  }

  console.log('Creating employment records and reviews…')
  const reviewers = USERS.filter((u) => !u.email.startsWith('admin'))
  let n = 0
  for (const [ei, employerId] of employerIds.entries()) {
    // Vary volume: first employer gets everyone, later ones fewer.
    const count = Math.max(1, reviewers.length - ei)
    for (let ri = 0; ri < count; ri++) {
      const reviewer = reviewers[ri]!
      const userId = userIds.get(reviewer.email)!
      const former = (ri + ei) % 3 === 0

      const { data: rec, error: recErr } = await admin
        .from('employment_records')
        .insert({
          user_id: userId,
          employer_id: employerId,
          status: former ? 'former' : 'current',
          start_month: 1 + ((ri + ei) % 12),
          start_year: 2021 + (ri % 3),
          end_month: former ? 6 : null,
          end_year: former ? 2024 : null,
          job_title: ['Software Engineer', 'QA Analyst', 'Business Analyst', 'Senior Consultant', 'Data Engineer'][ri % 5]!,
          project_client: ri % 2 === 0 ? 'Retail banking migration' : null,
          location: ri % 2 === 1 ? 'Edison, NJ' : null,
        })
        .select('id')
        .single()
      if (recErr) throw recErr

      const overall = 2 + ((ri * 7 + ei * 3) % 4) // 2..5
      const { error: revErr } = await admin.from('reviews').insert({
        user_id: userId,
        employer_id: employerId,
        employment_record_id: rec.id,
        overall_rating: overall,
        title: `Seed review ${++n}: ${overall >= 4 ? 'solid' : 'mixed'} experience`,
        body: BODY,
        pros: overall >= 4 ? 'Reliable pay, real projects.' : null,
        cons: overall <= 3 ? 'Long bench periods, opaque allocation.' : null,
        rating_pay: Math.max(1, overall - 1),
        rating_communication: overall,
        rating_job_stability: Math.min(5, overall + 1),
        rating_project_quality: overall,
        rating_visa_support: Math.min(5, overall + 1),
        rating_transparency: Math.max(1, overall - 1),
        rating_management: overall,
        // One reviewer opts in, everyone else stays anonymous — exercises both paths.
        show_name: reviewer.email.startsWith('raju'),
        show_job_title: reviewer.email.startsWith('raju'),
        show_employment_duration: reviewer.email.startsWith('raju'),
        show_linkedin: reviewer.email.startsWith('raju'),
        acknowledged_at: new Date().toISOString(),
      })
      if (revErr) throw revErr
    }
  }

  console.log(`\nSeeded ${USERS.length} users, ${EMPLOYERS.length} employers, ${n} reviews.`)
  console.log(`Sign in as any *@${SEED_DOMAIN} with password "${SEED_PASSWORD}".`)
  console.log(`admin@${SEED_DOMAIN} holds the admin role.`)
}

const main = process.argv.includes('--reset') ? reset : seed
main().catch((err) => {
  console.error(err)
  process.exit(1)
})
