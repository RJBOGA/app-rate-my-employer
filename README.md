# Rate My Desi Employer

Anonymous, community-written reviews of Desi-owned and Desi-focused employers and
consultancies. Browse without an account; sign in to add your employment record and
one review per employer, choosing field by field what — if anything — readers learn
about you.

**Stack:** React 19 · TypeScript (strict) · Vite · Tailwind CSS v4 · shadcn-style
primitives on Radix · React Router · TanStack Query · Zod · Supabase (Postgres, Auth,
RLS, SQL functions).

## Product invariants, and where each one is enforced

| Rule | Enforced by |
|---|---|
| Anonymous by default | Six `show_*` columns on `reviews`, all `DEFAULT false` |
| Email and phone never public | Not selected by `public_reviews`; not in the client type; `PRIVACY_FIELDS` has no such entry |
| One review per user per employer | `UNIQUE INDEX reviews_one_per_user_per_employer` |
| Author can edit, cannot un-hide | Column-level `UPDATE` grant excludes `status` |
| Employer duplicates prevented | `employers` has no `INSERT` policy; `create_employer()` normalises and checks every time |
| Highest Rated is volume-aware | Bayesian `weighted_score` in `employer_rankings`; UI never shows the formula |
| Reports never auto-delete | `report_content()` only inserts into `reports` |
| Every admin action audited | Each admin RPC calls `log_moderation_action()`; log is append-only |

Full schema notes, the entity-naming decision record, and the RLS verification script
are in [`supabase/README.md`](supabase/README.md).

## Run locally

```bash
cp .env.example .env.local     # publishable key only — see the file's comments
npm install
npm run dev                    # http://localhost:5173
```

The database is already migrated on the linked Supabase project. To point at a fresh
project, apply `supabase/migrations/*.sql` in order and update `.env.local`.

### Scripts

| command | does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | typecheck + production build to `dist/` |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | oxlint |
| `npm test` | Vitest (jsdom) — validation, privacy invariants, formatting, RatingInput a11y |

### Development seed (optional)

```bash
SEED_ENV=development SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  node --experimental-strip-types scripts/seed-dev.ts          # add
node --experimental-strip-types scripts/seed-dev.ts --reset    # remove
```

Every seeded user is `*@seed.invalid` and every employer is prefixed `[Seed]`, so the
set is trivially identifiable and removable. The script refuses to run without
`SEED_ENV=development` and is never part of any build.

### First administrator

No UI exists for this by design. As the database owner:

```sql
insert into user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'you@example.com';
```

## Deploy (free tier)

Any static host works — the app is a Vite SPA talking directly to Supabase.

- **Vercel / Netlify / Cloudflare Pages:** build command `npm run build`, output `dist`,
  set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Add a SPA rewrite
  (`/* → /index.html`).
- **Supabase Auth → URL Configuration:** add the deployed origin to *Site URL* and
  *Redirect URLs* so sign-up confirmation and password-reset links return to the app.

Nothing server-side is required. There is no service-role key anywhere in the client.

## Layout

```
supabase/migrations/    0001–0010, applied in order
supabase/tests/         rls_verification.sql — run as owner; passes when forbidden ops raise
scripts/seed-dev.ts     dev-only fixtures
src/lib/                env, supabase client, types, validation, formatting, errors, motion tokens
src/hooks/              auth + typed TanStack Query hooks per domain
src/components/ui/      primitives (Button, Dialog, Select, …)
src/components/         domain components (EmployerCombobox, ReviewCard, PrivacyControls, …)
src/pages/              public, auth, account, admin (lazy-loaded)
src/test/               Vitest
```

## Out of scope for V1

Employer accounts/claiming/responses, payments, messaging, job board, AI-generated
reviews, salary data, social following, mobile app, public API. The schema leaves room
for these (e.g. `employers.status`, `reports.target_type` enums) without building them.
