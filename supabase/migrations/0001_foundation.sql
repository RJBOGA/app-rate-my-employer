-- =====================================================================
-- 0001_foundation.sql
-- Extensions, shared helpers, app config, profiles, roles.
--
-- Privacy note: profiles.email and profiles.phone are PRIVATE FOREVER.
-- They are never selected by any public view or RPC in this codebase.
-- =====================================================================

create extension if not exists pg_trgm;
create extension if not exists citext;

-- ---------------------------------------------------------------------
-- Tunable configuration (keeps the ranking constant out of migrations)
-- ---------------------------------------------------------------------
create table if not exists app_config (
  key         text primary key,
  value       jsonb       not null,
  description text,
  updated_at  timestamptz not null default now()
);

comment on table app_config is
  'Runtime-tunable constants. Readable by service role / definer functions only.';

insert into app_config (key, value, description) values
  ('ranking_confidence', '10'::jsonb,
   'Bayesian prior weight C: number of "virtual" average reviews blended into every employer score. Higher = more volume required to climb the rankings.'),
  ('ranking_prior_mean', '3.5'::jsonb,
   'Fallback prior mean used when there are not yet enough global reviews to compute one.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Employer name normalisation.
--
-- IMMUTABLE so it can back a generated column + unique index.
--
-- Deliberately does NOT strip legal suffixes: the product spec treats
-- "Tata Consultancy Services" and "Tata Consultancy Services LLC" as two
-- distinct employers with separate review counts. Suffix stripping would
-- make those collide and become unrepresentable. Near-duplicates are
-- surfaced to the user via trigram similarity at creation time instead
-- of being silently collapsed here.
-- ---------------------------------------------------------------------
create or replace function normalize_employer_name(input text)
returns text
language sql
immutable
strict
as $$
  select nullif(
    btrim(
      regexp_replace(
        regexp_replace(lower(input), '[^a-z0-9]+', ' ', 'g'),
        '\s+', ' ', 'g'
      )
    ),
    ''
  );
$$;

comment on function normalize_employer_name(text) is
  'Case/punctuation-insensitive employer key. Preserves legal suffixes by design.';

-- ---------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,

  -- Publicly displayable ONLY when a review opts in (reviews.show_name).
  display_name       text,
  full_name          text,

  -- NEVER PUBLIC. Not referenced by any view or RPC returning public data.
  email              citext,
  phone              text,

  linkedin_url       text,
  country            text,
  state              text,
  city               text,

  is_suspended       boolean     not null default false,
  suspended_at       timestamptz,
  suspension_reason  text,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint profiles_linkedin_url_shape check (
    linkedin_url is null
    or linkedin_url ~* '^https?://([a-z0-9-]+\.)*linkedin\.com/.+'
  ),
  constraint profiles_display_name_len check (
    display_name is null or char_length(display_name) between 1 and 80
  ),
  constraint profiles_suspension_coherent check (
    (is_suspended = false and suspended_at is null)
    or (is_suspended = true and suspended_at is not null)
  )
);

comment on column profiles.email is 'PRIVATE. Never exposed publicly.';
comment on column profiles.phone is 'PRIVATE. Never exposed publicly.';

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Auto-provision a profile row on signup, seeding the private email from auth.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, display_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- Roles. No self-serve path to admin: the first admin is inserted by
-- hand via SQL (see docs). Deliberate.
-- ---------------------------------------------------------------------
create table if not exists user_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('admin', 'moderator')),
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- SECURITY DEFINER + stable so RLS policies can call it without
-- recursing into user_roles' own policies.
create or replace function is_staff(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles where user_id = uid
  );
$$;

create or replace function is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles where user_id = uid and role = 'admin'
  );
$$;

create or replace function is_suspended(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_suspended from profiles where id = uid), false);
$$;
