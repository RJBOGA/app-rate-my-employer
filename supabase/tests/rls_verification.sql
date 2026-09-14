-- =====================================================================
-- RLS verification.
--
-- Runs every check AS the real API roles. The Supabase SQL editor and
-- the MCP execute_sql action both run as the table owner, which
-- bypasses RLS entirely — so a passing SELECT there proves nothing.
-- Each block below switches role, forges the JWT claim that auth.uid()
-- reads, attempts the forbidden thing, and records whether Postgres
-- refused it. A check PASSES when the operation is REJECTED.
--
-- Safe to re-run: fixtures are created and torn down inside the script.
-- Run as the owner (postgres / service role).
-- =====================================================================

create temporary table _rls_results (
  ordinal   serial,
  check_name text,
  passed    boolean,
  detail    text
);

-- The impersonated roles must be able to record their own results.
-- This is the only object they get extra rights on, and it is temporary.
grant insert, select on _rls_results to anon, authenticated;
grant usage, select on sequence _rls_results_ordinal_seq to anon, authenticated;

do $$
declare
  u_alice   uuid := 'a1a1a1a1-0000-0000-0000-000000000001';
  u_bob     uuid := 'b2b2b2b2-0000-0000-0000-000000000002';
  u_admin   uuid := 'ad0ad0ad-0000-0000-0000-000000000003';
  e_id      uuid := 'e0e0e0e0-0000-0000-0000-000000000001';
  er_alice  uuid := 'e1e1e1e1-0000-0000-0000-000000000001';
  er_bob    uuid := 'e1e1e1e1-0000-0000-0000-000000000002';
  r_alice   uuid;
  v_count   int;
  v_text    text;
  v_json    jsonb;
begin
  -- ---------------------------------------------------------------
  -- Fixtures (as owner)
  -- ---------------------------------------------------------------
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, raw_user_meta_data)
  values
    (u_alice, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','alice@rls.invalid','x',now(),now(),'{"display_name":"Alice"}'),
    (u_bob,   '00000000-0000-0000-0000-000000000000','authenticated','authenticated','bob@rls.invalid','x',now(),now(),'{"display_name":"Bob"}'),
    (u_admin, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@rls.invalid','x',now(),now(),'{"display_name":"Admin"}');

  update profiles set phone = '+1-555-ALICE' where id = u_alice;
  insert into user_roles (user_id, role) values (u_admin, 'admin');

  insert into employers (id, canonical_name, country) values (e_id, 'RLS Test Employer', 'United States');

  insert into employment_records (id, user_id, employer_id, status, start_month, start_year, job_title)
  values (er_alice, u_alice, e_id, 'current', 1, 2024, 'Engineer'),
         (er_bob,   u_bob,   e_id, 'current', 1, 2024, 'Engineer');

  insert into reviews (user_id, employer_id, employment_record_id, overall_rating, title, body,
    rating_pay, rating_communication, rating_job_stability, rating_project_quality,
    rating_visa_support, rating_transparency, rating_management, acknowledged_at)
  values (u_alice, e_id, er_alice, 4, 'Alice original title',
    'This is a body of at least fifty characters so that the CHECK constraint on body length is satisfied.',
    4,4,4,4,4,4,4, now())
  returning id into r_alice;

  -- ===============================================================
  -- 7. Unauthenticated user cannot access private profile data
  -- ===============================================================
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;

  begin
    select count(*) into v_count from profiles;
    insert into _rls_results (check_name, passed, detail)
    values ('7a anon: SELECT profiles denied', false, 'returned ' || v_count || ' rows — should have been permission denied');
  exception when insufficient_privilege then
    insert into _rls_results (check_name, passed, detail)
    values ('7a anon: SELECT profiles denied', true, sqlerrm);
  end;

  begin
    select count(*) into v_count from employment_records;
    insert into _rls_results (check_name, passed, detail)
    values ('7b anon: SELECT employment_records denied', false, 'returned ' || v_count || ' rows');
  exception when insufficient_privilege then
    insert into _rls_results (check_name, passed, detail)
    values ('7b anon: SELECT employment_records denied', true, sqlerrm);
  end;

  begin
    select count(*) into v_count from reviews;
    insert into _rls_results (check_name, passed, detail)
    values ('7c anon: SELECT reviews (base table) denied', false, 'returned ' || v_count || ' rows');
  exception when insufficient_privilege then
    insert into _rls_results (check_name, passed, detail)
    values ('7c anon: SELECT reviews (base table) denied', true, sqlerrm);
  end;

  -- anon CAN read the public projection, and it carries no PII
  select count(*) into v_count from public_reviews where employer_id = e_id;
  select string_agg(column_name, ',') into v_text
    from information_schema.columns
   where table_schema = 'public' and table_name = 'public_reviews'
     and (column_name ilike '%email%' or column_name ilike '%phone%' or column_name = 'user_id');
  insert into _rls_results (check_name, passed, detail)
  values ('7d anon: public_reviews readable, no PII columns',
          v_count = 1 and v_text is null,
          'rows=' || v_count || ' pii_columns=' || coalesce(v_text, 'none'));

  -- and the anonymous-by-default reviewer shows as anonymous
  select reviewer_name into v_text from public_reviews where employer_id = e_id;
  insert into _rls_results (check_name, passed, detail)
  values ('7e anon: reviewer identity hidden by default', v_text is null, 'reviewer_name=' || coalesce(v_text, 'NULL'));

  -- anon cannot call authenticated-only RPCs
  begin
    perform create_employer('Anon Employer', 'US');
    insert into _rls_results (check_name, passed, detail)
    values ('7f anon: create_employer() denied', false, 'call succeeded');
  exception when insufficient_privilege then
    insert into _rls_results (check_name, passed, detail)
    values ('7f anon: create_employer() denied', true, sqlerrm);
  end;

  reset role;

  -- ===============================================================
  -- 8. A user cannot create two active reviews for the same employer
  -- ===============================================================
  perform set_config('request.jwt.claims', json_build_object('sub', u_alice, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    insert into reviews (user_id, employer_id, employment_record_id, overall_rating, title, body,
      rating_pay, rating_communication, rating_job_stability, rating_project_quality,
      rating_visa_support, rating_transparency, rating_management, acknowledged_at)
    values (u_alice, e_id, er_alice, 2, 'Alice second review',
      'A second body of at least fifty characters to get past the length check on the reviews table.',
      2,2,2,2,2,2,2, now());
    insert into _rls_results (check_name, passed, detail)
    values ('8 alice: second review for same employer rejected', false, 'insert succeeded');
  exception when unique_violation then
    insert into _rls_results (check_name, passed, detail)
    values ('8 alice: second review for same employer rejected', true, sqlerrm);
  end;

  -- sanity: alice CAN read and update her own review
  update reviews set title = 'Alice edited title' where id = r_alice;
  get diagnostics v_count = row_count;
  insert into _rls_results (check_name, passed, detail)
  values ('8b alice: can update own review', v_count = 1, 'rows updated=' || v_count);

  -- alice cannot change her review's status (column not in UPDATE grant)
  begin
    update reviews set status = 'hidden' where id = r_alice;
    insert into _rls_results (check_name, passed, detail)
    values ('8c alice: cannot change own review status', false, 'update succeeded');
  exception when insufficient_privilege then
    insert into _rls_results (check_name, passed, detail)
    values ('8c alice: cannot change own review status', true, sqlerrm);
  end;

  -- alice cannot read another user's profile
  select count(*) into v_count from profiles where id = u_bob;
  insert into _rls_results (check_name, passed, detail)
  values ('8d alice: cannot read bob''s profile', v_count = 0, 'rows=' || v_count);

  -- alice cannot insert an employer directly (no INSERT policy; RPC only)
  begin
    insert into employers (canonical_name, country) values ('Direct Insert Co', 'US');
    insert into _rls_results (check_name, passed, detail)
    values ('8e alice: direct INSERT into employers denied', false, 'insert succeeded');
  exception when insufficient_privilege then
    insert into _rls_results (check_name, passed, detail)
    values ('8e alice: direct INSERT into employers denied', true, sqlerrm);
  end;

  reset role;

  -- ===============================================================
  -- 9. One user cannot modify another user's review
  -- ===============================================================
  perform set_config('request.jwt.claims', json_build_object('sub', u_bob, 'role', 'authenticated')::text, true);
  set local role authenticated;

  update reviews set title = 'Bob tampered' where id = r_alice;
  get diagnostics v_count = row_count;
  insert into _rls_results (check_name, passed, detail)
  values ('9a bob: UPDATE alice''s review affects 0 rows', v_count = 0, 'rows updated=' || v_count);

  select count(*) into v_count from reviews where id = r_alice;
  insert into _rls_results (check_name, passed, detail)
  values ('9b bob: cannot SELECT alice''s review from base table', v_count = 0, 'rows visible=' || v_count);

  begin
    delete from reviews where id = r_alice;
    insert into _rls_results (check_name, passed, detail)
    values ('9c bob: DELETE reviews denied', false, 'delete ran');
  exception when insufficient_privilege then
    insert into _rls_results (check_name, passed, detail)
    values ('9c bob: DELETE reviews denied', true, sqlerrm);
  end;

  -- bob cannot file a review against alice's employment record
  begin
    insert into reviews (user_id, employer_id, employment_record_id, overall_rating, title, body,
      rating_pay, rating_communication, rating_job_stability, rating_project_quality,
      rating_visa_support, rating_transparency, rating_management, acknowledged_at)
    values (u_bob, e_id, er_alice, 1, 'Bob using alice record',
      'Body long enough to pass the fifty character minimum on the reviews table check constraint.',
      1,1,1,1,1,1,1, now());
    insert into _rls_results (check_name, passed, detail)
    values ('9d bob: review via someone else''s employment record rejected', false, 'insert succeeded');
  exception when others then
    insert into _rls_results (check_name, passed, detail)
    values ('9d bob: review via someone else''s employment record rejected', true, sqlerrm);
  end;

  -- ===============================================================
  -- 10. Admin-only operations
  -- ===============================================================
  -- bob (not admin) is refused
  begin
    perform set_review_status(r_alice, 'hidden', 'bob trying');
    insert into _rls_results (check_name, passed, detail)
    values ('10a bob: set_review_status() denied', false, 'call succeeded');
  exception when insufficient_privilege then
    insert into _rls_results (check_name, passed, detail)
    values ('10a bob: set_review_status() denied', true, sqlerrm);
  end;

  begin
    perform set_user_suspension(u_alice, true, 'bob trying');
    insert into _rls_results (check_name, passed, detail)
    values ('10b bob: set_user_suspension() denied', false, 'call succeeded');
  exception when insufficient_privilege then
    insert into _rls_results (check_name, passed, detail)
    values ('10b bob: set_user_suspension() denied', true, sqlerrm);
  end;

  begin
    perform merge_employers(e_id, e_id, 'bob trying');
    insert into _rls_results (check_name, passed, detail)
    values ('10c bob: merge_employers() denied', false, 'call succeeded');
  exception when others then
    insert into _rls_results (check_name, passed, detail)
    values ('10c bob: merge_employers() denied', true, sqlerrm);
  end;

  begin
    select count(*) into v_count from moderation_audit_log;
    insert into _rls_results (check_name, passed, detail)
    values ('10d bob: audit log not readable', v_count = 0, 'rows=' || v_count);
  exception when insufficient_privilege then
    insert into _rls_results (check_name, passed, detail)
    values ('10d bob: audit log not readable', true, sqlerrm);
  end;

  begin
    perform log_moderation_action('fake', 'review', r_alice);
    insert into _rls_results (check_name, passed, detail)
    values ('10e bob: cannot write audit log directly', false, 'call succeeded');
  exception when insufficient_privilege then
    insert into _rls_results (check_name, passed, detail)
    values ('10e bob: cannot write audit log directly', true, sqlerrm);
  end;

  reset role;

  -- admin IS allowed, and the action is audited
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select set_review_status(r_alice, 'hidden', 'admin verification') into v_json;
  insert into _rls_results (check_name, passed, detail)
  values ('10f admin: set_review_status() allowed', v_json ->> 'status' = 'hidden', v_json::text);

  select count(*) into v_count from moderation_audit_log
   where target_id = r_alice and action = 'review.status_change' and actor_id = u_admin;
  insert into _rls_results (check_name, passed, detail)
  values ('10g admin: action recorded in audit log', v_count = 1, 'audit rows=' || v_count);

  -- hidden review no longer appears publicly
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select count(*) into v_count from public_reviews where id = r_alice;
  insert into _rls_results (check_name, passed, detail)
  values ('10h anon: hidden review absent from public_reviews', v_count = 0, 'rows=' || v_count);
  reset role;

  -- admin can restore
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select set_review_status(r_alice, 'published', 'restore') into v_json;
  insert into _rls_results (check_name, passed, detail)
  values ('10i admin: restore review allowed', v_json ->> 'status' = 'published', v_json::text);

  -- admin cannot self-suspend
  begin
    perform set_user_suspension(u_admin, true, 'oops');
    insert into _rls_results (check_name, passed, detail)
    values ('10j admin: cannot suspend self', false, 'call succeeded');
  exception when insufficient_privilege then
    insert into _rls_results (check_name, passed, detail)
    values ('10j admin: cannot suspend self', true, sqlerrm);
  end;

  -- admin cannot rewrite the audit log
  begin
    update moderation_audit_log set note = 'tampered' where actor_id = u_admin;
    get diagnostics v_count = row_count;
    insert into _rls_results (check_name, passed, detail)
    values ('10k admin: audit log is append-only', v_count = 0, 'rows updated=' || v_count);
  exception when insufficient_privilege then
    insert into _rls_results (check_name, passed, detail)
    values ('10k admin: audit log is append-only', true, sqlerrm);
  end;

  reset role;

  -- ---------------------------------------------------------------
  -- Teardown (as owner)
  -- ---------------------------------------------------------------
  delete from auth.users where id in (u_alice, u_bob, u_admin);
  delete from employers where id = e_id;
end
$$;

select ordinal, check_name, passed, detail from _rls_results order by ordinal;
