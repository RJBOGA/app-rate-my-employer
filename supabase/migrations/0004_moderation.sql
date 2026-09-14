-- =====================================================================
-- 0004_moderation.sql
-- Reports and the administrative audit trail.
--
-- Reporting never mutates the reported content. A report opens a queue
-- item; only an explicit admin decision changes a review's status.
-- =====================================================================

create type report_target_type as enum ('review', 'employer');
create type report_status as enum ('open', 'under_review', 'resolved', 'dismissed');

create table if not exists reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid not null references auth.users (id) on delete cascade,

  target_type     report_target_type not null,
  review_id       uuid references reviews (id) on delete cascade,
  employer_id     uuid references employers (id) on delete cascade,

  reason          text not null check (reason in (
                    'spam',
                    'harassment',
                    'personal_information',
                    'confidential_information',
                    'false_information',
                    'inappropriate_content',
                    'other'
                  )),
  details         text,

  status          report_status not null default 'open',
  resolved_by     uuid references auth.users (id) on delete set null,
  resolved_at     timestamptz,
  resolution_note text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Exactly one target, matching target_type.
  constraint reports_target_coherent check (
    (target_type = 'review'   and review_id is not null and employer_id is null)
    or (target_type = 'employer' and employer_id is not null and review_id is null)
  ),
  constraint reports_details_len check (details is null or char_length(details) <= 2000),
  constraint reports_resolution_coherent check (
    (status in ('open', 'under_review') and resolved_at is null and resolved_by is null)
    or (status in ('resolved', 'dismissed') and resolved_at is not null)
  )
);

-- One open report per reporter per target: stops a single user from
-- flooding the moderation queue, without blocking a later re-report.
create unique index if not exists reports_unique_reporter_review
  on reports (reporter_id, review_id)
  where review_id is not null and status in ('open', 'under_review');
create unique index if not exists reports_unique_reporter_employer
  on reports (reporter_id, employer_id)
  where employer_id is not null and status in ('open', 'under_review');

create index if not exists reports_status_idx on reports (status, created_at desc);
create index if not exists reports_review_idx on reports (review_id);
create index if not exists reports_employer_idx on reports (employer_id);

create trigger reports_set_updated_at
  before update on reports
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Audit trail. Append-only: no UPDATE or DELETE policy is ever granted,
-- and admins cannot rewrite history through the API.
-- ---------------------------------------------------------------------
create table if not exists moderation_audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users (id) on delete set null,
  action      text not null,
  target_type text not null,
  target_id   uuid,
  before      jsonb,
  after       jsonb,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists moderation_audit_log_target_idx
  on moderation_audit_log (target_type, target_id, created_at desc);
create index if not exists moderation_audit_log_actor_idx
  on moderation_audit_log (actor_id, created_at desc);
create index if not exists moderation_audit_log_created_idx
  on moderation_audit_log (created_at desc);

comment on table moderation_audit_log is
  'Append-only record of administrative actions. Never exposed to non-staff.';

create or replace function log_moderation_action(
  p_action      text,
  p_target_type text,
  p_target_id   uuid,
  p_before      jsonb default null,
  p_after       jsonb default null,
  p_note        text  default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into moderation_audit_log (actor_id, action, target_type, target_id, before, after, note)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_before, p_after, p_note);
$$;
