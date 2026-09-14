-- =====================================================================
-- 0008_rpc_admin.sql
-- Administrative operations. Every one writes an audit row.
-- =====================================================================

create or replace function require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not is_admin(v_uid) then
    raise exception 'Administrator privileges required' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

revoke all on function require_admin() from anon, authenticated;

-- ---------------------------------------------------------------------
-- set_review_status -- hide / restore / remove. Never a hard delete.
-- ---------------------------------------------------------------------
create or replace function set_review_status(
  p_review_id uuid,
  p_status    review_status,
  p_note      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := require_admin();
  v_before reviews;
  v_after  reviews;
begin
  select * into v_before from reviews where id = p_review_id;
  if not found then
    raise exception 'Review not found' using errcode = '23503';
  end if;

  update reviews set status = p_status where id = p_review_id
  returning * into v_after;

  perform log_moderation_action(
    'review.status_change',
    'review',
    p_review_id,
    jsonb_build_object('status', v_before.status),
    jsonb_build_object('status', v_after.status),
    p_note
  );

  return jsonb_build_object(
    'id', v_after.id,
    'status', v_after.status,
    'previous_status', v_before.status
  );
end;
$$;

revoke all on function set_review_status(uuid, review_status, text) from anon;
grant execute on function set_review_status(uuid, review_status, text) to authenticated;

-- ---------------------------------------------------------------------
-- set_user_suspension
-- ---------------------------------------------------------------------
create or replace function set_user_suspension(
  p_user_id   uuid,
  p_suspended boolean,
  p_reason    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := require_admin();
  v_before boolean;
begin
  select is_suspended into v_before from profiles where id = p_user_id;
  if v_before is null then
    raise exception 'User not found' using errcode = '23503';
  end if;

  if p_user_id = v_actor then
    raise exception 'Administrators cannot suspend themselves' using errcode = '42501';
  end if;

  update profiles
  set is_suspended      = p_suspended,
      suspended_at      = case when p_suspended then now() else null end,
      suspension_reason = case when p_suspended then nullif(btrim(coalesce(p_reason, '')), '') else null end
  where id = p_user_id;

  perform log_moderation_action(
    case when p_suspended then 'user.suspend' else 'user.reinstate' end,
    'user',
    p_user_id,
    jsonb_build_object('is_suspended', v_before),
    jsonb_build_object('is_suspended', p_suspended),
    p_reason
  );

  return jsonb_build_object('user_id', p_user_id, 'is_suspended', p_suspended);
end;
$$;

revoke all on function set_user_suspension(uuid, boolean, text) from anon;
grant execute on function set_user_suspension(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------
-- resolve_report
-- ---------------------------------------------------------------------
create or replace function resolve_report(
  p_report_id uuid,
  p_status    report_status,
  p_note      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := require_admin();
  v_before report_status;
begin
  select status into v_before from reports where id = p_report_id;
  if v_before is null then
    raise exception 'Report not found' using errcode = '23503';
  end if;

  update reports
  set status          = p_status,
      resolved_by     = case when p_status in ('resolved', 'dismissed') then v_actor else null end,
      resolved_at     = case when p_status in ('resolved', 'dismissed') then now() else null end,
      resolution_note = nullif(btrim(coalesce(p_note, '')), '')
  where id = p_report_id;

  perform log_moderation_action(
    'report.' || p_status::text,
    'report',
    p_report_id,
    jsonb_build_object('status', v_before),
    jsonb_build_object('status', p_status),
    p_note
  );

  return jsonb_build_object('id', p_report_id, 'status', p_status);
end;
$$;

revoke all on function resolve_report(uuid, report_status, text) from anon;
grant execute on function resolve_report(uuid, report_status, text) to authenticated;

-- ---------------------------------------------------------------------
-- update_employer -- canonical data edits, audited.
-- ---------------------------------------------------------------------
create or replace function update_employer(
  p_employer_id    uuid,
  p_canonical_name text default null,
  p_website        text default null,
  p_country        text default null,
  p_state          text default null,
  p_city           text default null,
  p_description    text default null,
  p_status         employer_status default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := require_admin();
  v_before employers;
  v_after  employers;
begin
  select * into v_before from employers where id = p_employer_id;
  if not found then
    raise exception 'Employer not found' using errcode = '23503';
  end if;

  if p_status = 'merged' then
    raise exception 'Use merge_employers() to merge an employer' using errcode = '22023';
  end if;

  update employers
  set canonical_name = coalesce(nullif(btrim(coalesce(p_canonical_name, '')), ''), canonical_name),
      website        = case when p_website     is null then website     else nullif(btrim(p_website), '')     end,
      country        = coalesce(nullif(btrim(coalesce(p_country, '')), ''), country),
      state          = case when p_state       is null then state       else nullif(btrim(p_state), '')       end,
      city           = case when p_city        is null then city        else nullif(btrim(p_city), '')        end,
      description    = case when p_description is null then description else nullif(btrim(p_description), '') end,
      status         = coalesce(p_status, status)
  where id = p_employer_id
  returning * into v_after;

  -- Preserve the old spelling as an alias so existing links and searches
  -- still resolve after a rename.
  if normalize_employer_name(v_after.canonical_name)
     is distinct from normalize_employer_name(v_before.canonical_name) then
    insert into employer_aliases (employer_id, alias, source, created_by)
    values (p_employer_id, v_before.canonical_name, 'admin', v_actor)
    on conflict (employer_id, normalized_alias) do nothing;
  end if;

  perform log_moderation_action(
    'employer.update',
    'employer',
    p_employer_id,
    to_jsonb(v_before) - 'created_by',
    to_jsonb(v_after) - 'created_by',
    null
  );

  return to_jsonb(v_after) - 'created_by';
end;
$$;

revoke all on function update_employer(uuid, text, text, text, text, text, text, employer_status) from anon;
grant execute on function update_employer(uuid, text, text, text, text, text, text, employer_status) to authenticated;

-- ---------------------------------------------------------------------
-- merge_employers
--
-- Moves employment records and reviews from source to target, records the
-- source's name as an alias of the target, and marks the source merged.
--
-- Conflict handling: a user may legitimately hold records at BOTH
-- employers (they claimed the duplicate and the canonical). The unique
-- (user_id, employer_id) constraints mean one side has to go. The
-- target-side row is kept as canonical and the source-side row is
-- removed -- but its full contents, review included, are written into the
-- audit log first, so a merge is reconstructible after the fact.
-- ---------------------------------------------------------------------
create or replace function merge_employers(
  p_source_id uuid,
  p_target_id uuid,
  p_note      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor            uuid := require_admin();
  v_source           employers;
  v_target           employers;
  v_conflicts        jsonb := '[]'::jsonb;
  v_conflict_count   integer := 0;
  v_moved_records    integer := 0;
  v_moved_reviews    integer := 0;
  v_moved_aliases    integer := 0;
begin
  if p_source_id = p_target_id then
    raise exception 'Cannot merge an employer into itself' using errcode = '22023';
  end if;

  select * into v_source from employers where id = p_source_id for update;
  if not found then
    raise exception 'Source employer not found' using errcode = '23503';
  end if;

  select * into v_target from employers where id = p_target_id for update;
  if not found then
    raise exception 'Target employer not found' using errcode = '23503';
  end if;

  if v_target.status <> 'active' then
    raise exception 'Target employer must be active' using errcode = '22023';
  end if;
  if v_source.status = 'merged' then
    raise exception 'Source employer has already been merged' using errcode = '22023';
  end if;

  -- Capture, then clear, rows that would collide on the target side.
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'user_id', er.user_id,
        'employment_record', to_jsonb(er),
        'review', (select to_jsonb(r) from reviews r where r.employment_record_id = er.id)
      )
    ), '[]'::jsonb),
    count(*)
  into v_conflicts, v_conflict_count
  from employment_records er
  where er.employer_id = p_source_id
    and exists (
      select 1 from employment_records t
      where t.employer_id = p_target_id and t.user_id = er.user_id
    );

  if v_conflict_count > 0 then
    -- Cascades to the attached review; both are preserved in v_conflicts.
    delete from employment_records er
    where er.employer_id = p_source_id
      and exists (
        select 1 from employment_records t
        where t.employer_id = p_target_id and t.user_id = er.user_id
      );
  end if;

  -- Records first: the reviews trigger checks that a review's employment
  -- record points at the same employer as the review.
  update employment_records set employer_id = p_target_id where employer_id = p_source_id;
  get diagnostics v_moved_records = row_count;

  update reviews set employer_id = p_target_id where employer_id = p_source_id;
  get diagnostics v_moved_reviews = row_count;

  -- Re-home the source's aliases, and keep its own name searchable.
  update employer_aliases a
  set employer_id = p_target_id
  where a.employer_id = p_source_id
    and not exists (
      select 1 from employer_aliases t
      where t.employer_id = p_target_id
        and t.normalized_alias = a.normalized_alias
    );
  get diagnostics v_moved_aliases = row_count;

  delete from employer_aliases where employer_id = p_source_id;

  insert into employer_aliases (employer_id, alias, source, created_by)
  values (p_target_id, v_source.canonical_name, 'merge', v_actor)
  on conflict (employer_id, normalized_alias) do nothing;

  update employers
  set status = 'merged', merged_into_id = p_target_id
  where id = p_source_id;

  -- Any reports filed against the source follow it to the target.
  update reports set employer_id = p_target_id
  where employer_id = p_source_id and target_type = 'employer';

  perform log_moderation_action(
    'employer.merge',
    'employer',
    p_source_id,
    jsonb_build_object('source', to_jsonb(v_source) - 'created_by'),
    jsonb_build_object(
      'target_id', p_target_id,
      'target_name', v_target.canonical_name,
      'moved_employment_records', v_moved_records,
      'moved_reviews', v_moved_reviews,
      'moved_aliases', v_moved_aliases,
      'discarded_conflicts', v_conflicts
    ),
    p_note
  );

  return jsonb_build_object(
    'source_id', p_source_id,
    'target_id', p_target_id,
    'moved_employment_records', v_moved_records,
    'moved_reviews', v_moved_reviews,
    'moved_aliases', v_moved_aliases,
    'discarded_conflict_count', v_conflict_count
  );
end;
$$;

revoke all on function merge_employers(uuid, uuid, text) from anon;
grant execute on function merge_employers(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- add_employer_alias -- admin-curated alias ("TCS" -> Tata Consultancy...)
-- ---------------------------------------------------------------------
create or replace function add_employer_alias(
  p_employer_id uuid,
  p_alias       text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := require_admin();
  v_norm  text := normalize_employer_name(p_alias);
  v_row   employer_aliases;
  v_clash employers;
begin
  if v_norm is null then
    raise exception 'Alias must contain letters or numbers' using errcode = '22023';
  end if;

  -- An alias must not shadow a different employer's canonical name.
  select * into v_clash
  from employers
  where normalized_name = v_norm and status = 'active' and id <> p_employer_id
  limit 1;

  if found then
    raise exception 'Alias collides with the canonical name of employer % (%)',
      v_clash.canonical_name, v_clash.id
      using errcode = '23505';
  end if;

  insert into employer_aliases (employer_id, alias, source, created_by)
  values (p_employer_id, btrim(p_alias), 'admin', v_actor)
  on conflict (employer_id, normalized_alias) do nothing
  returning * into v_row;

  perform log_moderation_action(
    'employer.alias_add', 'employer', p_employer_id,
    null, jsonb_build_object('alias', btrim(p_alias)), null
  );

  return to_jsonb(v_row);
end;
$$;

revoke all on function add_employer_alias(uuid, text) from anon;
grant execute on function add_employer_alias(uuid, text) to authenticated;
