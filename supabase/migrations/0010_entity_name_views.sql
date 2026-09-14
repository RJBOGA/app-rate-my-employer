-- =====================================================================
-- 0010_entity_name_views.sql
--
-- DECISION RECORD — read this before "fixing" it.
--
-- The product specification lists two entities by name that this schema
-- models differently:
--
--   spec name                  actual structure
--   -------------------------  -----------------------------------------
--   review_category_ratings    seven NOT NULL smallint columns on reviews
--   admin_actions              table moderation_audit_log
--
-- Why the category ratings are columns, not a child table:
--   * The category set is fixed at seven by the product. A child table
--     models a variable set; here it would only add a join (and a
--     GROUP BY) to every employer-statistics query for no modelling gain.
--   * NOT NULL columns guarantee every published review carries all
--     seven ratings, so category averages are computed over the same
--     population as the overall average. A child table cannot express
--     "exactly seven rows, one per category" without a trigger.
--   * The spec's own rule — "do not prematurely denormalize" — argues
--     for the simpler shape, not against it.
--
-- Why the audit table is named moderation_audit_log:
--   * It records moderator actions, not only administrator ones, and
--     the name says what it is for. Purely a naming difference.
--
-- To honour the spec's vocabulary without restructuring verified,
-- tested tables, both names are exposed here as read-only views. They
-- are real, queryable relations with the shape the names imply. Nothing
-- writes through them.
-- =====================================================================

-- ---------------------------------------------------------------------
-- review_category_ratings: one row per (review, category)
-- ---------------------------------------------------------------------
create or replace view review_category_ratings as
select
  r.id          as review_id,
  r.employer_id,
  r.status,
  c.category,
  c.rating,
  r.created_at,
  r.updated_at
from reviews r
cross join lateral (
  values
    ('pay',             r.rating_pay),
    ('communication',   r.rating_communication),
    ('job_stability',   r.rating_job_stability),
    ('project_quality', r.rating_project_quality),
    ('visa_support',    r.rating_visa_support),
    ('transparency',    r.rating_transparency),
    ('management',      r.rating_management)
) as c(category, rating);

comment on view review_category_ratings is
  'Unpivoted projection of the seven category rating columns on reviews. Read-only; see migration 0010 for why these are columns rather than a table.';

-- Same visibility rules as the base table: authors see their own rows,
-- staff see all. Public consumers should use public_reviews instead.
alter view review_category_ratings set (security_invoker = on);
grant select on review_category_ratings to authenticated;

-- ---------------------------------------------------------------------
-- admin_actions: alias of the audit log
-- ---------------------------------------------------------------------
create or replace view admin_actions as
select
  id,
  actor_id      as admin_id,
  action,
  target_type,
  target_id,
  before,
  after,
  note,
  created_at
from moderation_audit_log;

comment on view admin_actions is
  'Alias of moderation_audit_log using the specification''s entity name. Append-only via log_moderation_action(); no writes through this view.';

alter view admin_actions set (security_invoker = on);
grant select on admin_actions to authenticated;
