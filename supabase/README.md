# Database

Supabase project `ccdtebczdoaanpcpwklx` (Postgres 17, us-west-2). Everything in
`migrations/` has been applied in order; `tests/rls_verification.sql` proves the
security model under the real API roles.

## Shape

```
auth.users ──1:1── profiles           private: email, phone (never in any public projection)
             └──── user_roles         admin | moderator — granted by hand, no self-serve

employers ──1:N── employer_aliases    "TCS" → Tata Consultancy Services
    │      normalized_name (generated, unique among non-merged rows)
    │      status: active | merged | hidden | removed;  merged_into_id
    │
    ├──1:N── employment_records       one per (user, employer); dates checked by trigger
    │            └──1:1── reviews     one per (user, employer) — UNIQUE INDEX, not app logic
    │                       overall_rating + seven NOT NULL category columns
    │                       six show_* privacy flags, ALL default false
    │                       status: published | hidden | removed
    └──1:N── reports                  target = review XOR employer; never mutates the target

moderation_audit_log                  append-only; every admin RPC writes a row
app_config                            ranking constants; not client-readable
```

### Public projections (what the browser reads)

| relation | who | what |
|---|---|---|
| `public_reviews` | anon, authenticated | Published reviews. Reviewer identity columns are `CASE WHEN show_x THEN … END`. **`email`, `phone`, `user_id` are not selected — they cannot leak because they are not in the result shape.** |
| `employer_stats` | anon, authenticated | Per-employer counts and averages. `review_count` and `employee_count` come from separate subqueries so neither multiplies the other. |
| `employer_rankings` | anon, authenticated | Active employers + stats + `weighted_score`. Sort key only; the UI never displays it. |
| `search_employers(q, limit)` | anon, authenticated | Trigram typeahead over canonical names **and** aliases. Prefix hits rank first, then similarity, then volume. |

### Write paths (what the browser calls)

`employers` has **no INSERT policy**. `create_employer()` is the only door, so the
server-side duplicate check runs on every creation regardless of client behaviour.
It returns `{status: 'duplicate' | 'needs_confirmation' | 'created', …}` so the UI
can render the "did you mean" step from the same call.

Reviews and employment records are inserted directly under RLS (`user_id = auth.uid()`,
not suspended). The authenticated role's UPDATE grant on `reviews` **excludes `status`**,
so an author cannot un-hide a moderated review.

All moderation goes through `SECURITY DEFINER` RPCs that call `require_admin()` and
`log_moderation_action()`: `set_review_status`, `set_user_suspension`, `resolve_report`,
`update_employer`, `merge_employers`, `add_employer_alias`.

### Ranking

`weighted = (C·m + Σr) / (C + n)` — Bayesian shrinkage toward the global mean `m`,
with confidence `C` read from `app_config.ranking_confidence` (default 10). Two 5-star
reviews cannot outrank four hundred 4.6s. Computed in the `employer_rankings` view;
not denormalised because the aggregate is cheap at this scale and the constant is
tunable without a migration. The "Highest Rated" tab additionally floors at 3 reviews
so zero-review employers (which score exactly `m`) don't sit mid-table.

## Decision record: entity names

The specification lists `review_category_ratings` and `admin_actions`. This schema
models them as **seven NOT NULL columns on `reviews`** and **`moderation_audit_log`**
respectively, and exposes both spec names as read-only views (migration 0010). The
reasoning is in that file's header; in short: a fixed set of seven ratings is a row,
not a table, and NOT NULL columns are the only way to guarantee every review carries
all seven without a trigger.

## Granting the first administrator

There is deliberately no UI for this. Run as the owner:

```sql
insert into user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'you@example.com';
```

## Verifying security

`tests/rls_verification.sql` switches to `anon` / `authenticated` with a forged
`request.jwt.claims` and asserts that forbidden operations **raise**. A check passes
when Postgres refuses. Run it from the SQL editor as the owner; it creates and
removes its own fixtures.

## Regenerating client types

```
supabase gen types typescript --project-id ccdtebczdoaanpcpwklx > src/lib/database.types.ts
```

Then re-convert the row `interface`s to `type` aliases (supabase-js needs implicit
index signatures) — or keep the hand-maintained file, which mirrors the schema.
