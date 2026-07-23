-- ============================================================
--  Migration 002: link URLs, worker-share settings, withdrawal split
--  Run in Supabase SQL Editor AFTER schema.sql. Idempotent.
-- ============================================================

-- Real offer URL per link (e.g. https://adclickad.com/get/?spot_id=...)
alter table links add column if not exists url text;

-- Global app settings (single row).
create table if not exists app_settings (
  id                int primary key default 1,
  worker_share_pct  numeric(5,2) not null default 25,
  updated_at        timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);
insert into app_settings (id, worker_share_pct) values (1, 25)
on conflict (id) do nothing;

-- Snapshot of the worker's cut at the moment of withdrawal (historical accuracy).
alter table withdrawals add column if not exists worker_share numeric(12,2) not null default 0;

-- Recreate the dashboard view to expose the link URL.
create or replace view link_today_stats as
select
  l.id                                   as link_id,
  l.name,
  l.geo_id,
  l.url,
  g.code                                 as geo_code,
  g.flag_emoji,
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
