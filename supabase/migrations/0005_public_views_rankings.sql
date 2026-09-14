-- =====================================================================
-- 0005_public_views_rankings.sql
--
-- The privacy boundary. Anonymous and authenticated clients read reviews
-- ONLY through public_reviews. That view does not select profiles.email
-- or profiles.phone at all, so no combination of filters, joins or
-- crafted requests from a browser can surface them -- the columns are
-- not in the result shape to begin with.
--
-- Every other reviewer-identifying field is wrapped in a CASE gated on
-- that review's own opt-in flag, which defaults to false.
--
-- These views run with owner rights (security_invoker defaults to off),
-- so they can read base tables whose RLS denies direct client access.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Aggregates. Separate subqueries rather than one join, so review counts
-- are not multiplied by employment records.
-- ---------------------------------------------------------------------
create or replace view employer_stats as
select
  e.id                                          as employer_id,
  coalesce(rs.review_count, 0)::bigint          as review_count,
  coalesce(rs.rating_sum, 0)::bigint            as rating_sum,
  rs.avg_rating,
  rs.avg_pay,
  rs.avg_communication,
  rs.avg_job_stability,
  rs.avg_project_quality,
  rs.avg_visa_support,
  rs.avg_transparency,
  rs.avg_management,
  rs.last_review_at,
  coalesce(es.employee_count, 0)::bigint        as employee_count,
  coalesce(es.current_count, 0)::bigint         as current_employee_count,
  coalesce(es.former_count, 0)::bigint          as former_employee_count
from employers e
left join (
  select
    employer_id,
    count(*)                                    as review_count,
    sum(overall_rating)                         as rating_sum,
    round(avg(overall_rating), 2)               as avg_rating,
    round(avg(rating_pay), 2)                   as avg_pay,
    round(avg(rating_communication), 2)         as avg_communication,
    round(avg(rating_job_stability), 2)         as avg_job_stability,
    round(avg(rating_project_quality), 2)       as avg_project_quality,
    round(avg(rating_visa_support), 2)          as avg_visa_support,
    round(avg(rating_transparency), 2)          as avg_transparency,
    round(avg(rating_management), 2)            as avg_management,
    max(created_at)                             as last_review_at
  from reviews
  where status = 'published'
  group by employer_id
) rs on rs.employer_id = e.id
left join (
  select
    employer_id,
    count(*)                                          as employee_count,
    count(*) filter (where status = 'current')         as current_count,
    count(*) filter (where status = 'former')          as former_count
  from employment_records
  group by employer_id
) es on es.employer_id = e.id;

comment on view employer_stats is
  'Per-employer aggregates. employee_count counts employment records (people who claimed the employer), which is distinct from review_count.';

-- ---------------------------------------------------------------------
-- Rankings.
--
-- Bayesian shrinkage toward the global mean:
--
--   weighted = (C * m + sum(ratings)) / (C + n)
--
-- where m is the global published mean and C is a confidence constant
-- read from app_config. An employer with 2 five-star reviews therefore
-- cannot outrank one with 400 reviews averaging 4.6.
--
-- weighted_score exists to ORDER BY. The UI renders avg_rating and
-- review_count only; the formula is never surfaced to users.
-- ---------------------------------------------------------------------
create or replace view employer_rankings as
with cfg as (
  select
    coalesce((select (value #>> '{}')::numeric from app_config where key = 'ranking_confidence'), 10)  as confidence,
    coalesce((select (value #>> '{}')::numeric from app_config where key = 'ranking_prior_mean'), 3.5) as prior_mean
),
glob as (
  select avg(overall_rating)::numeric as mean_rating
  from reviews
  where status = 'published'
)
select
  e.id,
  e.canonical_name,
  e.website,
  e.country,
  e.state,
  e.city,
  e.description,
  e.created_at,
  s.review_count,
  s.avg_rating,
  s.employee_count,
  s.current_employee_count,
  s.former_employee_count,
  s.last_review_at,
  round(
    ((cfg.confidence * coalesce(glob.mean_rating, cfg.prior_mean)) + s.rating_sum)
    / (cfg.confidence + s.review_count),
    4
  ) as weighted_score
from employers e
join employer_stats s on s.employer_id = e.id
cross join cfg
cross join glob
where e.status = 'active';

comment on view employer_rankings is
  'Employer list/ranking projection. weighted_score is a Bayesian-shrunk sort key; do not display it.';

-- ---------------------------------------------------------------------
-- Public reviews. The only path by which a client reads someone else''s
-- review.
--
-- Note what is absent: profiles.email and profiles.phone. They are not
-- selected here, in any other view, or in any RPC that returns rows to a
-- client.
-- ---------------------------------------------------------------------
create or replace view public_reviews as
select
  r.id,
  r.employer_id,

  r.overall_rating,
  r.title,
  r.body,
  r.pros,
  r.cons,

  r.rating_pay,
  r.rating_communication,
  r.rating_job_stability,
  r.rating_project_quality,
  r.rating_visa_support,
  r.rating_transparency,
  r.rating_management,

  r.created_at,
  r.updated_at,

  -- Always shown: whether the reviewer is a current or former employee.
  -- This carries no identity on its own and is core review context.
  er.status as employment_status,

  -- Opt-in only. Default false => NULL => the UI renders "Anonymous".
  case when r.show_name                then p.display_name end as reviewer_name,
  case when r.show_employment_duration
       then employment_duration_months(er.status, er.start_year, er.start_month, er.end_year, er.end_month)
  end as employment_duration_months,
  case when r.show_job_title           then er.job_title end      as job_title,
  case when r.show_project_client      then er.project_client end as project_client,
  case when r.show_employment_location then er.location end       as employment_location,
  case when r.show_linkedin            then p.linkedin_url end    as linkedin_url

from reviews r
join employment_records er on er.id = r.employment_record_id
join profiles p            on p.id  = r.user_id
where r.status = 'published';

comment on view public_reviews is
  'Privacy-filtered review projection. Reviewer identity fields are gated on per-review opt-in flags; email and phone are structurally absent.';

-- ---------------------------------------------------------------------
-- Typeahead search.
--
-- Matches canonical names and aliases, so "TCS" resolves to Tata
-- Consultancy Services. Exact-prefix matches rank above fuzzy ones, then
-- review volume breaks ties -- which is what makes the dropdown feel
-- like it is reading the user''s mind on the third keystroke.
-- ---------------------------------------------------------------------
create or replace function search_employers(
  p_query text,
  p_limit integer default 8
)
returns table (
  id                uuid,
  canonical_name    text,
  country           text,
  state             text,
  city              text,
  review_count      bigint,
  avg_rating        numeric,
  matched_alias     text,
  similarity_score  real
)
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    select
      normalize_employer_name(p_query) as nq,
      greatest(least(coalesce(p_limit, 8), 25), 1) as lim
  ),
  candidates as (
    -- direct match on the canonical name
    select
      e.id,
      null::text as matched_alias,
      similarity(e.normalized_name, q.nq) as sim,
      (e.normalized_name like q.nq || '%') as is_prefix
    from employers e, q
    where e.status = 'active'
      and q.nq is not null
      and (e.normalized_name like q.nq || '%' or e.normalized_name % q.nq)

    union all

    -- match via a stored alias
    select
      a.employer_id as id,
      a.alias as matched_alias,
      similarity(a.normalized_alias, q.nq) as sim,
      (a.normalized_alias like q.nq || '%') as is_prefix
    from employer_aliases a
    join employers e on e.id = a.employer_id and e.status = 'active'
    cross join q
    where q.nq is not null
      and (a.normalized_alias like q.nq || '%' or a.normalized_alias % q.nq)
  ),
  best as (
    select
      c.id,
      -- prefer a canonical-name hit over an alias hit for the same employer
      (array_agg(c.matched_alias order by (c.matched_alias is null) desc, c.sim desc))[1] as matched_alias,
      max(c.sim) as sim,
      bool_or(c.is_prefix) as is_prefix
    from candidates c
    group by c.id
  )
  select
    e.id,
    e.canonical_name,
    e.country,
    e.state,
    e.city,
    s.review_count,
    s.avg_rating,
    b.matched_alias,
    b.sim
  from best b
  join employers e      on e.id = b.id
  join employer_stats s on s.employer_id = e.id
  cross join q
  order by b.is_prefix desc, b.sim desc, s.review_count desc, e.canonical_name asc
  limit (select lim from q);
$$;

comment on function search_employers(text, integer) is
  'Typeahead employer search across canonical names and aliases.';
