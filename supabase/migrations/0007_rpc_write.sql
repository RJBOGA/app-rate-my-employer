-- =====================================================================
-- 0007_rpc_write.sql
-- Server-side write paths.
--
-- employers has no INSERT policy, so create_employer() below is the only
-- way an employer can come into existence. The duplicate check therefore
-- runs on every creation, unconditionally, regardless of what the client
-- does or skips.
-- =====================================================================

-- ---------------------------------------------------------------------
-- "Not in the future" for employment dates. Lives in a trigger because
-- now() is not immutable and cannot appear in a CHECK constraint.
-- ---------------------------------------------------------------------
create or replace function employment_records_validate_dates()
returns trigger
language plpgsql
as $$
declare
  current_ym integer := extract(year from now())::int * 12 + extract(month from now())::int;
  start_ym   integer := new.start_year::int * 12 + new.start_month::int;
  end_ym     integer;
begin
  if start_ym > current_ym then
    raise exception 'Start date cannot be in the future'
      using errcode = '23514';
  end if;

  if new.status = 'former' then
    end_ym := new.end_year::int * 12 + new.end_month::int;
    if end_ym > current_ym then
      raise exception 'End date cannot be in the future'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger employment_records_validate_dates_trg
  before insert or update on employment_records
  for each row execute function employment_records_validate_dates();

-- ---------------------------------------------------------------------
-- create_employer
--
-- Returns a jsonb envelope rather than raising, so the UI can render the
-- "did you mean one of these?" step from the same call:
--
--   { status: 'duplicate',            employer: {...} }
--   { status: 'needs_confirmation',   candidates: [...] }
--   { status: 'created',              employer: {...} }
--
-- 'duplicate' is a hard stop -- an exact normalized-name collision can
-- never create a second row. 'needs_confirmation' is advisory: the client
-- re-calls with p_confirm_similar => true once the user has looked at the
-- candidates and said none of them is their employer.
-- ---------------------------------------------------------------------
create or replace function create_employer(
  p_canonical_name   text,
  p_country          text,
  p_state            text    default null,
  p_city             text    default null,
  p_website          text    default null,
  p_description      text    default null,
  p_confirm_similar  boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_name       text := btrim(p_canonical_name);
  v_norm       text;
  v_existing   employers;
  v_candidates jsonb;
  v_new        employers;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if is_suspended(v_uid) then
    raise exception 'Account is suspended' using errcode = '42501';
  end if;

  if v_name is null or char_length(v_name) < 2 then
    raise exception 'Employer name must be at least 2 characters' using errcode = '22023';
  end if;

  if p_country is null or btrim(p_country) = '' then
    raise exception 'Country is required' using errcode = '22023';
  end if;

  v_norm := normalize_employer_name(v_name);
  if v_norm is null then
    raise exception 'Employer name must contain letters or numbers' using errcode = '22023';
  end if;

  -- ---- Final duplicate check: exact normalized name on the canonical row
  select * into v_existing
  from employers
  where normalized_name = v_norm
    and status <> 'merged'
  limit 1;

  if found then
    return jsonb_build_object(
      'status', 'duplicate',
      'matched_on', 'canonical_name',
      'employer', to_jsonb(v_existing) - 'created_by'
    );
  end if;

  -- ---- Final duplicate check: exact normalized name on a stored alias
  select e.* into v_existing
  from employer_aliases a
  join employers e on e.id = a.employer_id
  where a.normalized_alias = v_norm
    and e.status = 'active'
  limit 1;

  if found then
    return jsonb_build_object(
      'status', 'duplicate',
      'matched_on', 'alias',
      'employer', to_jsonb(v_existing) - 'created_by'
    );
  end if;

  -- ---- Advisory near-duplicate pass
  if not coalesce(p_confirm_similar, false) then
    select jsonb_agg(c order by c ->> 'similarity' desc)
      into v_candidates
    from (
      select jsonb_build_object(
               'id', e.id,
               'canonical_name', e.canonical_name,
               'country', e.country,
               'state', e.state,
               'city', e.city,
               'review_count', s.review_count,
               'avg_rating', s.avg_rating,
               'similarity', round(similarity(e.normalized_name, v_norm)::numeric, 3)
             ) as c
      from employers e
      join employer_stats s on s.employer_id = e.id
      where e.status = 'active'
        and similarity(e.normalized_name, v_norm) >= 0.45
      order by similarity(e.normalized_name, v_norm) desc
      limit 5
    ) q;

    if v_candidates is not null then
      return jsonb_build_object(
        'status', 'needs_confirmation',
        'candidates', v_candidates
      );
    end if;
  end if;

  -- ---- Create. The unique index is the real backstop against a race
  -- between two concurrent callers passing the checks above.
  begin
    insert into employers (canonical_name, country, state, city, website, description, created_by)
    values (
      v_name,
      btrim(p_country),
      nullif(btrim(coalesce(p_state, '')), ''),
      nullif(btrim(coalesce(p_city, '')), ''),
      nullif(btrim(coalesce(p_website, '')), ''),
      nullif(btrim(coalesce(p_description, '')), '')
    )
    returning * into v_new;
  exception
    when unique_violation then
      select * into v_existing
      from employers
      where normalized_name = v_norm and status <> 'merged'
      limit 1;

      return jsonb_build_object(
        'status', 'duplicate',
        'matched_on', 'race',
        'employer', to_jsonb(v_existing) - 'created_by'
      );
  end;

  return jsonb_build_object(
    'status', 'created',
    'employer', to_jsonb(v_new) - 'created_by'
  );
end;
$$;

revoke all on function create_employer(text, text, text, text, text, text, boolean) from anon;
grant execute on function create_employer(text, text, text, text, text, text, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- report_content -- opens a queue item. Never mutates the target.
-- ---------------------------------------------------------------------
create or replace function report_content(
  p_target_type report_target_type,
  p_target_id   uuid,
  p_reason      text,
  p_details     text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if is_suspended(v_uid) then
    raise exception 'Account is suspended' using errcode = '42501';
  end if;

  if p_target_type = 'review' then
    if not exists (select 1 from reviews where id = p_target_id and status = 'published') then
      raise exception 'Review not found' using errcode = '23503';
    end if;

    insert into reports (reporter_id, target_type, review_id, reason, details)
    values (v_uid, 'review', p_target_id, p_reason, nullif(btrim(coalesce(p_details, '')), ''))
    on conflict do nothing
    returning id into v_id;
  else
    if not exists (select 1 from employers where id = p_target_id and status = 'active') then
      raise exception 'Employer not found' using errcode = '23503';
    end if;

    insert into reports (reporter_id, target_type, employer_id, reason, details)
    values (v_uid, 'employer', p_target_id, p_reason, nullif(btrim(coalesce(p_details, '')), ''))
    on conflict do nothing
    returning id into v_id;
  end if;

  -- Already reported by this user and still open: treat as success so the
  -- UI does not leak whether a prior report exists.
  return v_id;
end;
$$;

revoke all on function report_content(report_target_type, uuid, text, text) from anon;
grant execute on function report_content(report_target_type, uuid, text, text) to authenticated;
