-- =====================================================================
-- 0006_rls.sql
-- Row Level Security across every table, plus column-level grants.
--
-- Shape of the model:
--   * Anonymous users read employers and public_reviews. Nothing else.
--   * Authenticated users additionally read/write their OWN rows.
--   * Employer creation and merging have no INSERT/UPDATE policy at all;
--     they are reachable only through SECURITY DEFINER functions, which
--     is what guarantees the server-side duplicate check cannot be
--     bypassed by a direct client insert.
--   * Staff read the moderation surface.
--   * app_config has no policies whatsoever: definer functions only.
-- =====================================================================

alter table profiles            enable row level security;
alter table user_roles          enable row level security;
alter table employers           enable row level security;
alter table employer_aliases    enable row level security;
alter table employment_records  enable row level security;
alter table reviews             enable row level security;
alter table reports             enable row level security;
alter table moderation_audit_log enable row level security;
alter table app_config          enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy profiles_select_own on profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_select_staff on profiles
  for select to authenticated
  using (is_staff());

create policy profiles_insert_own on profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_own on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Suspension state is administrative: strip it from the client's
-- writable column set entirely rather than trusting a policy predicate.
-- profiles.email is also excluded -- it mirrors auth.users.email and is
-- maintained by the signup trigger.
revoke update on profiles from authenticated;
grant update (display_name, full_name, phone, linkedin_url, country, state, city)
  on profiles to authenticated;

-- ---------------------------------------------------------------------
-- user_roles -- readable, never writable through the API.
-- The first admin is granted by hand (see supabase/README.md).
-- ---------------------------------------------------------------------
create policy user_roles_select_own on user_roles
  for select to authenticated
  using (user_id = auth.uid() or is_staff());

revoke insert, update, delete on user_roles from authenticated, anon;

-- ---------------------------------------------------------------------
-- employers -- world readable when active; writes go through RPCs.
-- ---------------------------------------------------------------------
create policy employers_select_active on employers
  for select to anon, authenticated
  using (status in ('active', 'merged'));

create policy employers_select_staff on employers
  for select to authenticated
  using (is_staff());

create policy employers_update_staff on employers
  for update to authenticated
  using (is_admin())
  with check (is_admin());

-- Deliberately no INSERT policy: create_employer() is the only door.
revoke insert, delete on employers from authenticated, anon;

-- ---------------------------------------------------------------------
-- employer_aliases
-- ---------------------------------------------------------------------
create policy employer_aliases_select_all on employer_aliases
  for select to anon, authenticated
  using (true);

create policy employer_aliases_write_admin on employer_aliases
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- ---------------------------------------------------------------------
-- employment_records -- private to their owner. The public projection of
-- a record (job title, tenure, ...) is exposed only through
-- public_reviews, gated on that review's opt-in flags.
-- ---------------------------------------------------------------------
create policy employment_records_select_own on employment_records
  for select to authenticated
  using (user_id = auth.uid() or is_staff());

create policy employment_records_insert_own on employment_records
  for insert to authenticated
  with check (user_id = auth.uid() and not is_suspended());

create policy employment_records_update_own on employment_records
  for update to authenticated
  using (user_id = auth.uid() and not is_suspended())
  with check (user_id = auth.uid());

create policy employment_records_delete_own on employment_records
  for delete to authenticated
  using (user_id = auth.uid() and not is_suspended());

-- ---------------------------------------------------------------------
-- reviews -- the author reads and edits their own row; everyone else
-- reads the filtered view.
-- ---------------------------------------------------------------------
create policy reviews_select_own on reviews
  for select to authenticated
  using (user_id = auth.uid() or is_staff());

create policy reviews_insert_own on reviews
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not is_suspended()
    and status = 'published'
    and acknowledged_at is not null
  );

create policy reviews_update_own on reviews
  for update to authenticated
  using (user_id = auth.uid() and not is_suspended() and status <> 'removed')
  with check (user_id = auth.uid());

create policy reviews_update_staff on reviews
  for update to authenticated
  using (is_staff())
  with check (is_staff());

-- Authors edit content and privacy flags. They cannot touch `status`
-- (that is moderation) or re-point the review at another user/employer.
revoke update on reviews from authenticated;
grant update (
  overall_rating, title, body, pros, cons,
  rating_pay, rating_communication, rating_job_stability,
  rating_project_quality, rating_visa_support, rating_transparency,
  rating_management,
  show_name, show_employment_duration, show_job_title,
  show_project_client, show_employment_location, show_linkedin,
  acknowledged_at
) on reviews to authenticated;

revoke delete on reviews from authenticated, anon;

-- ---------------------------------------------------------------------
-- reports -- authenticated reporting only (abuse prevention).
-- ---------------------------------------------------------------------
create policy reports_insert_own on reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and not is_suspended());

create policy reports_select_own on reports
  for select to authenticated
  using (reporter_id = auth.uid() or is_staff());

create policy reports_update_staff on reports
  for update to authenticated
  using (is_staff())
  with check (is_staff());

revoke delete on reports from authenticated, anon;

-- ---------------------------------------------------------------------
-- moderation_audit_log -- staff read, append-only via definer function.
-- No UPDATE or DELETE policy exists, so history cannot be rewritten
-- through the API even by an admin.
-- ---------------------------------------------------------------------
create policy moderation_audit_select_staff on moderation_audit_log
  for select to authenticated
  using (is_staff());

revoke insert, update, delete on moderation_audit_log from authenticated, anon;

-- ---------------------------------------------------------------------
-- app_config -- no policies. Reachable only by definer functions and the
-- service role, so the ranking constant is not client-visible.
-- ---------------------------------------------------------------------
revoke all on app_config from authenticated, anon;

-- ---------------------------------------------------------------------
-- Grants on the public projections.
-- ---------------------------------------------------------------------
grant select on employer_stats     to anon, authenticated;
grant select on employer_rankings  to anon, authenticated;
grant select on public_reviews     to anon, authenticated;

grant execute on function search_employers(text, integer) to anon, authenticated;
grant execute on function employment_duration_months(employment_status, smallint, smallint, smallint, smallint)
  to anon, authenticated;

-- Helper predicates are safe to expose (they only report on the caller).
grant execute on function is_admin(uuid)     to authenticated;
grant execute on function is_staff(uuid)     to authenticated;
grant execute on function is_suspended(uuid) to authenticated;

-- Internal only.
revoke all on function log_moderation_action(text, text, uuid, jsonb, jsonb, text)
  from authenticated, anon;
revoke all on function normalize_employer_name(text) from anon;
