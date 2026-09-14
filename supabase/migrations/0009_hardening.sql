-- =====================================================================
-- 0009_hardening.sql
--
-- Fixes surfaced by the Supabase security linter.
--
-- The important one: Postgres grants EXECUTE on new functions to PUBLIC
-- by default, and PUBLIC includes anon/authenticated. The earlier
-- "revoke ... from anon" statements were therefore no-ops -- the grant
-- being inherited was the PUBLIC one, not a role-specific one. Every
-- internal function below is revoked from PUBLIC explicitly and then
-- re-granted only to the roles that should hold it.
--
-- Most notably log_moderation_action() was callable by anon, which would
-- have let anyone write arbitrary rows into the audit trail.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Move extensions out of the public schema.
-- ---------------------------------------------------------------------
create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;

do $$
begin
  begin
    alter extension pg_trgm set schema extensions;
  exception when others then
    raise notice 'pg_trgm left in public: %', sqlerrm;
  end;
  begin
    alter extension citext set schema extensions;
  exception when others then
    raise notice 'citext left in public: %', sqlerrm;
  end;
end
$$;

-- ---------------------------------------------------------------------
-- Pin search_path on every function. Includes `extensions` so the
-- trigram operators (% , similarity()) still resolve after the move.
-- ---------------------------------------------------------------------
alter function normalize_employer_name(text)            set search_path = public, extensions;
alter function set_updated_at()                          set search_path = public, extensions;
alter function reviews_validate_employment_record()      set search_path = public, extensions;
alter function employment_records_validate_dates()       set search_path = public, extensions;
alter function employment_duration_months(employment_status, smallint, smallint, smallint, smallint)
                                                         set search_path = public, extensions;
alter function search_employers(text, integer)           set search_path = public, extensions;
alter function create_employer(text, text, text, text, text, text, boolean)
                                                         set search_path = public, extensions;
alter function report_content(report_target_type, uuid, text, text)
                                                         set search_path = public, extensions;
alter function log_moderation_action(text, text, uuid, jsonb, jsonb, text)
                                                         set search_path = public, extensions;
alter function require_admin()                           set search_path = public, extensions;
alter function set_review_status(uuid, review_status, text)        set search_path = public, extensions;
alter function set_user_suspension(uuid, boolean, text)            set search_path = public, extensions;
alter function resolve_report(uuid, report_status, text)           set search_path = public, extensions;
alter function update_employer(uuid, text, text, text, text, text, text, employer_status)
                                                         set search_path = public, extensions;
alter function merge_employers(uuid, uuid, text)         set search_path = public, extensions;
alter function add_employer_alias(uuid, text)            set search_path = public, extensions;
alter function handle_new_user()                         set search_path = public, extensions;
alter function is_admin(uuid)                            set search_path = public, extensions;
alter function is_staff(uuid)                            set search_path = public, extensions;
alter function is_suspended(uuid)                        set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- Close the PUBLIC execute grants.
-- ---------------------------------------------------------------------

-- Internal only: trigger bodies, the audit writer, the admin gate.
revoke all on function handle_new_user()                      from public, anon, authenticated;
revoke all on function set_updated_at()                       from public, anon, authenticated;
revoke all on function reviews_validate_employment_record()   from public, anon, authenticated;
revoke all on function employment_records_validate_dates()    from public, anon, authenticated;
revoke all on function require_admin()                        from public, anon, authenticated;
revoke all on function log_moderation_action(text, text, uuid, jsonb, jsonb, text)
                                                              from public, anon, authenticated;
revoke all on function normalize_employer_name(text)          from public, anon;

-- Authenticated-only write paths.
revoke all on function create_employer(text, text, text, text, text, text, boolean)
  from public, anon;
grant execute on function create_employer(text, text, text, text, text, text, boolean)
  to authenticated;

revoke all on function report_content(report_target_type, uuid, text, text) from public, anon;
grant execute on function report_content(report_target_type, uuid, text, text) to authenticated;

-- Admin RPCs. Still revoked from anon so an unauthenticated caller gets a
-- permission error at the API boundary rather than reaching require_admin().
revoke all on function set_review_status(uuid, review_status, text) from public, anon;
grant execute on function set_review_status(uuid, review_status, text) to authenticated;

revoke all on function set_user_suspension(uuid, boolean, text) from public, anon;
grant execute on function set_user_suspension(uuid, boolean, text) to authenticated;

revoke all on function resolve_report(uuid, report_status, text) from public, anon;
grant execute on function resolve_report(uuid, report_status, text) to authenticated;

revoke all on function update_employer(uuid, text, text, text, text, text, text, employer_status)
  from public, anon;
grant execute on function update_employer(uuid, text, text, text, text, text, text, employer_status)
  to authenticated;

revoke all on function merge_employers(uuid, uuid, text) from public, anon;
grant execute on function merge_employers(uuid, uuid, text) to authenticated;

revoke all on function add_employer_alias(uuid, text) from public, anon;
grant execute on function add_employer_alias(uuid, text) to authenticated;

-- Role predicates: signed-in callers only.
revoke all on function is_admin(uuid)     from public, anon;
revoke all on function is_staff(uuid)     from public, anon;
revoke all on function is_suspended(uuid) from public, anon;
grant execute on function is_admin(uuid)     to authenticated;
grant execute on function is_staff(uuid)     to authenticated;
grant execute on function is_suspended(uuid) to authenticated;

-- Public read helpers stay open (search is browsable without an account).
grant execute on function search_employers(text, integer) to anon, authenticated;
grant execute on function employment_duration_months(employment_status, smallint, smallint, smallint, smallint)
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- Stop the role predicates from being used to probe other accounts.
-- A caller may ask about themselves; only staff may ask about anyone else.
-- RLS policies call the no-argument form, which defaults to auth.uid(),
-- so this does not affect them.
-- ---------------------------------------------------------------------
create or replace function is_staff(uid uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if uid is null then
    return false;
  end if;
  if uid <> auth.uid()
     and not exists (select 1 from user_roles where user_id = auth.uid()) then
    return false;
  end if;
  return exists (select 1 from user_roles where user_id = uid);
end;
$$;

create or replace function is_admin(uid uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if uid is null then
    return false;
  end if;
  if uid <> auth.uid()
     and not exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin') then
    return false;
  end if;
  return exists (select 1 from user_roles where user_id = uid and role = 'admin');
end;
$$;

create or replace function is_suspended(uid uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if uid is null then
    return false;
  end if;
  if uid <> auth.uid()
     and not exists (select 1 from user_roles where user_id = auth.uid()) then
    return false;
  end if;
  return coalesce((select p.is_suspended from profiles p where p.id = uid), false);
end;
$$;

revoke all on function is_admin(uuid)     from public, anon;
revoke all on function is_staff(uuid)     from public, anon;
revoke all on function is_suspended(uuid) from public, anon;
grant execute on function is_admin(uuid)     to authenticated;
grant execute on function is_staff(uuid)     to authenticated;
grant execute on function is_suspended(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Belt-and-braces on the tables behind the privacy boundary.
--
-- RLS already denies anon every row here, but revoking the table grant
-- means a future accidentally-permissive policy still cannot expose
-- profiles.email or an unpublished review: there is no SELECT privilege
-- to exercise in the first place.
--
-- public_reviews / employer_stats / employer_rankings intentionally keep
-- owner rights (security_invoker off) -- that is precisely what lets them
-- serve curated columns from tables the caller cannot read directly.
-- The linter flags this pattern generically; here it IS the design.
-- ---------------------------------------------------------------------
revoke select on profiles           from anon;
revoke select on reviews            from anon;
revoke select on employment_records from anon;
revoke select on reports            from anon;
revoke select on user_roles         from anon;
revoke select on moderation_audit_log from anon;

revoke all on employers        from anon;
grant  select on employers     to anon;
revoke all on employer_aliases from anon;
grant  select on employer_aliases to anon;

comment on view public_reviews is
  'Privacy boundary. Runs with owner rights by design so it can project curated columns from RLS-protected tables. profiles.email and profiles.phone are not selected here and must never be added.';
