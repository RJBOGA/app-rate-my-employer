-- =====================================================================
-- 0002_employers_employment.sql
-- Canonical employers, separately-stored aliases, employment records.
-- =====================================================================

create type employer_status as enum ('active', 'merged', 'hidden', 'removed');
create type employment_status as enum ('current', 'former');

-- ---------------------------------------------------------------------
-- Employers
-- ---------------------------------------------------------------------
create table if not exists employers (
  id              uuid primary key default gen_random_uuid(),

  canonical_name  text not null,
  normalized_name text generated always as (normalize_employer_name(canonical_name)) stored,

  website         text,
  country         text not null,
  state           text,
  city            text,
  description     text,

  status          employer_status not null default 'active',
  -- Set when this row loses a merge; points at the surviving employer.
  merged_into_id  uuid references employers (id) on delete set null,

  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint employers_canonical_name_len check (
    char_length(btrim(canonical_name)) between 2 and 160
  ),
  constraint employers_normalized_name_present check (normalized_name is not null),
  constraint employers_website_shape check (
    website is null or website ~* '^https?://[^\s/$.?#].[^\s]*$'
  ),
  constraint employers_description_len check (
    description is null or char_length(description) <= 2000
  ),
  constraint employers_merge_coherent check (
    (status = 'merged' and merged_into_id is not null)
    or (status <> 'merged' and merged_into_id is null)
  ),
  constraint employers_no_self_merge check (merged_into_id is distinct from id)
);

-- The hard duplicate guarantee. Merged rows are excluded so a losing
-- employer's name does not permanently block the canonical spelling.
create unique index if not exists employers_normalized_name_key
  on employers (normalized_name)
  where status <> 'merged';

-- Fuzzy matching for the typeahead + the pre-create "did you mean" step.
create index if not exists employers_normalized_name_trgm
  on employers using gin (normalized_name gin_trgm_ops);
create index if not exists employers_canonical_name_trgm
  on employers using gin (canonical_name gin_trgm_ops);
create index if not exists employers_status_idx on employers (status);
create index if not exists employers_created_at_idx on employers (created_at desc);

create trigger employers_set_updated_at
  before update on employers
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Aliases: stored separately so many spellings resolve to one canonical
-- employer ("TCS" / "Tata Consultancy Service" -> Tata Consultancy Services).
-- ---------------------------------------------------------------------
create table if not exists employer_aliases (
  id               uuid primary key default gen_random_uuid(),
  employer_id      uuid not null references employers (id) on delete cascade,
  alias            text not null,
  normalized_alias text generated always as (normalize_employer_name(alias)) stored,
  -- 'merge' aliases are created automatically when duplicates are merged.
  source           text not null default 'admin' check (source in ('user', 'admin', 'merge')),
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),

  constraint employer_aliases_len check (char_length(btrim(alias)) between 2 and 160),
  constraint employer_aliases_normalized_present check (normalized_alias is not null)
);

create unique index if not exists employer_aliases_unique
  on employer_aliases (employer_id, normalized_alias);
create index if not exists employer_aliases_normalized_trgm
  on employer_aliases using gin (normalized_alias gin_trgm_ops);
create index if not exists employer_aliases_employer_idx
  on employer_aliases (employer_id);

-- ---------------------------------------------------------------------
-- Employment records
-- ---------------------------------------------------------------------
create table if not exists employment_records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  employer_id  uuid not null references employers (id) on delete cascade,

  status       employment_status not null,

  start_month  smallint not null,
  start_year   smallint not null,
  end_month    smallint,
  end_year     smallint,

  job_title    text not null,
  project_client text,
  location     text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- One employment association per user per employer.
  constraint employment_records_unique unique (user_id, employer_id),

  constraint employment_start_month_range check (start_month between 1 and 12),
  constraint employment_end_month_range check (end_month is null or end_month between 1 and 12),
  -- Upper bound is a static sanity rail; "not in the future" is enforced
  -- server-side in the write RPC (now() is not immutable, so it cannot
  -- live in a CHECK constraint).
  constraint employment_start_year_range check (start_year between 1950 and 2100),
  constraint employment_end_year_range check (end_year is null or end_year between 1950 and 2100),

  constraint employment_end_fields_match_status check (
    (status = 'current' and end_month is null and end_year is null)
    or (status = 'former' and end_month is not null and end_year is not null)
  ),
  constraint employment_end_after_start check (
    status = 'current'
    or (end_year::int * 12 + end_month::int) >= (start_year::int * 12 + start_month::int)
  ),
  constraint employment_job_title_len check (char_length(btrim(job_title)) between 2 and 120),
  constraint employment_project_client_len check (
    project_client is null or char_length(project_client) <= 120
  ),
  constraint employment_location_len check (location is null or char_length(location) <= 120)
);

create index if not exists employment_records_user_idx on employment_records (user_id);
create index if not exists employment_records_employer_idx on employment_records (employer_id);

create trigger employment_records_set_updated_at
  before update on employment_records
  for each row execute function set_updated_at();

-- Tenure in whole months. For current employees it grows with time, so
-- this is STABLE rather than IMMUTABLE (cannot back a generated column).
create or replace function employment_duration_months(
  p_status      employment_status,
  p_start_year  smallint,
  p_start_month smallint,
  p_end_year    smallint,
  p_end_month   smallint
)
returns integer
language sql
stable
as $$
  select greatest(
    0,
    (
      case
        when p_status = 'current'
          then (extract(year from now())::int * 12 + extract(month from now())::int)
        else (p_end_year::int * 12 + p_end_month::int)
      end
    ) - (p_start_year::int * 12 + p_start_month::int)
  );
$$;
