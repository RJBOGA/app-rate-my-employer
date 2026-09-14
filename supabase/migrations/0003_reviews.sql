-- =====================================================================
-- 0003_reviews.sql
-- Reviews, category ratings, per-field privacy opt-ins.
--
-- Every show_* flag defaults to FALSE. Anonymous is not a setting the
-- user opts into; it is the state they start in and must actively leave.
-- =====================================================================

create type review_status as enum ('published', 'hidden', 'removed');

create table if not exists reviews (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  employer_id          uuid not null references employers (id) on delete cascade,
  employment_record_id uuid not null references employment_records (id) on delete cascade,

  -- Primary rating; drives all rankings.
  overall_rating       smallint not null,

  title                text not null,
  body                 text not null,
  pros                 text,
  cons                 text,

  -- Supporting category ratings. NOT NULL so category averages on an
  -- employer profile are always computed over the same population.
  rating_pay             smallint not null,
  rating_communication   smallint not null,
  rating_job_stability   smallint not null,
  rating_project_quality smallint not null,
  rating_visa_support    smallint not null,
  rating_transparency    smallint not null,
  rating_management      smallint not null,

  -- ---------------- Privacy opt-ins (all default private) ----------------
  show_name                boolean not null default false,
  show_employment_duration boolean not null default false,
  show_job_title           boolean not null default false,
  show_project_client      boolean not null default false,
  show_employment_location boolean not null default false,
  show_linkedin            boolean not null default false,

  -- Required acknowledgement that this reflects personal experience.
  acknowledged_at      timestamptz not null,

  status               review_status not null default 'published',

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint reviews_overall_range check (overall_rating between 1 and 5),
  constraint reviews_rating_pay_range check (rating_pay between 1 and 5),
  constraint reviews_rating_communication_range check (rating_communication between 1 and 5),
  constraint reviews_rating_job_stability_range check (rating_job_stability between 1 and 5),
  constraint reviews_rating_project_quality_range check (rating_project_quality between 1 and 5),
  constraint reviews_rating_visa_support_range check (rating_visa_support between 1 and 5),
  constraint reviews_rating_transparency_range check (rating_transparency between 1 and 5),
  constraint reviews_rating_management_range check (rating_management between 1 and 5),

  constraint reviews_title_len check (char_length(btrim(title)) between 5 and 140),
  constraint reviews_body_len check (char_length(btrim(body)) between 50 and 8000),
  constraint reviews_pros_len check (pros is null or char_length(pros) <= 2000),
  constraint reviews_cons_len check (cons is null or char_length(cons) <= 2000)
);

-- One review per user per employer, enforced by the database rather than
-- by application logic. Edits update this row in place. Removed reviews
-- still hold the slot, so a removed review cannot be re-filed as new.
create unique index if not exists reviews_one_per_user_per_employer
  on reviews (user_id, employer_id);

create index if not exists reviews_employer_published_idx
  on reviews (employer_id, created_at desc)
  where status = 'published';
create index if not exists reviews_user_idx on reviews (user_id);
create index if not exists reviews_status_idx on reviews (status);
create index if not exists reviews_employment_record_idx on reviews (employment_record_id);

create trigger reviews_set_updated_at
  before update on reviews
  for each row execute function set_updated_at();

-- The employment record backing a review must belong to the review's
-- author and to the same employer. Enforced in a trigger because a CHECK
-- constraint cannot reach another table.
create or replace function reviews_validate_employment_record()
returns trigger
language plpgsql
as $$
declare
  rec_user_id     uuid;
  rec_employer_id uuid;
begin
  select user_id, employer_id
    into rec_user_id, rec_employer_id
  from employment_records
  where id = new.employment_record_id;

  if rec_user_id is null then
    raise exception 'employment record % not found', new.employment_record_id
      using errcode = '23503';
  end if;

  if rec_user_id <> new.user_id then
    raise exception 'employment record does not belong to the review author'
      using errcode = '42501';
  end if;

  if rec_employer_id <> new.employer_id then
    raise exception 'employment record employer does not match the review employer'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger reviews_validate_employment_record_trg
  before insert or update of employment_record_id, user_id, employer_id on reviews
  for each row execute function reviews_validate_employment_record();
