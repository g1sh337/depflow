-- ============================================================
--  Migration 004: geos as country + source/advertiser tag
--  Run in Supabase SQL Editor. Idempotent.
-- ============================================================

alter table geos add column if not exists country_code text;  -- ISO-2 (drives flag)
alter table geos add column if not exists tag text;            -- free source, e.g. "1xbet LUDMILLA"

-- Expose the tag through the dashboard view.
drop view if exists link_today_stats;
create view link_today_stats as
select
  l.id                                   as link_id,
  l.name,
  l.geo_id,
  l.url,
  g.code                                 as geo_code,
  g.flag_emoji,
  g.tag                                  as geo_tag,
  l.plan_count,
  l.plan_amount,
  l.amount_presets,
  l.is_archived,
  coalesce(d.deposits_count, 0)          as deposits_count,
  coalesce(d.deposits_sum, 0)            as deposits_sum,
  d.last_deposit_at                      as last_deposit_at,
  case
    when l.plan_count = 0 then 0
    else round(coalesce(d.deposits_count, 0)::numeric / l.plan_count * 100)
  end                                    as plan_pct
from links l
left join geos g on g.id = l.geo_id
left join lateral (
  select
    count(*)                  as deposits_count,
    sum(amount)               as deposits_sum,
    max(created_at)           as last_deposit_at
  from deposits dep
  where dep.link_id = l.id
    and dep.is_deleted = false
    and dep.created_at >= (date_trunc('day', now() at time zone 'Europe/Moscow') at time zone 'Europe/Moscow')
) d on true
where l.is_archived = false;
