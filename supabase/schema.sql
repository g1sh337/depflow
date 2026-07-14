-- ============================================================
--  DepFlow — Telegram Mini App: deposits & withdrawals tracker
--  Postgres / Supabase schema
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
do $$ begin
  create type user_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deposit_type as enum ('ftd', 'redep');
exception when duplicate_object then null; end $$;

do $$ begin
  create type audit_action as enum ('login','create','update','delete','archive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notif_type as enum ('plan_done','plan_exceeded','no_activity','turnover');
exception when duplicate_object then null; end $$;

-- ---------- USERS ----------
create table if not exists users (
  id           uuid primary key default gen_random_uuid(),
  telegram_id  bigint unique not null,
  username     text,
  first_name   text,
  photo_url    text,
  role         user_role not null default 'user',
  is_active    boolean not null default true,
  timezone     text not null default 'Europe/Moscow',
  created_at   timestamptz not null default now(),
  last_login_at timestamptz
);

-- ---------- INVITE KEYS ----------
create table if not exists invite_keys (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  role        user_role not null default 'user',
  created_by  uuid references users(id),
  used_by     uuid references users(id),
  used_at     timestamptz,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------- GEOS ----------
create table if not exists geos (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  flag_emoji  text,
  sort_order  int not null default 0
);

-- ---------- LINKS (offers) ----------
create table if not exists links (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  geo_id        uuid references geos(id),
  plan_count    int not null default 0,
  plan_amount   numeric(12,2) not null default 0,
  amount_presets jsonb not null default '[15,25,50,100]'::jsonb,
  is_archived   boolean not null default false,
  created_by    uuid references users(id),
  created_at    timestamptz not null default now()
);

-- ---------- DEPOSITS ----------
create table if not exists deposits (
  id          uuid primary key default gen_random_uuid(),
  link_id     uuid not null references links(id),
  geo_id      uuid references geos(id),           -- denormalized for fast analytics
  amount      numeric(12,2) not null check (amount > 0),
  type        deposit_type not null default 'ftd',
  user_id     uuid not null references users(id),
  is_deleted  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------- WITHDRAWALS (profit taken out) ----------
create table if not exists withdrawals (
  id          uuid primary key default gen_random_uuid(),
  link_id     uuid not null references links(id),
  amount      numeric(12,2) not null check (amount > 0),
  user_id     uuid not null references users(id),
  is_deleted  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------- EXPENSES (traffic cost, optional — needed for true ROI) ----------
create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  link_id     uuid references links(id),
  amount      numeric(12,2) not null check (amount > 0),
  spent_on    date not null default current_date,
  note        text,
  user_id     uuid not null references users(id),
  created_at  timestamptz not null default now()
);

-- ---------- AUDIT LOG ----------
create table if not exists audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id),
  action      audit_action not null,
  entity_type text,
  entity_id   uuid,
  changes     jsonb,
  created_at  timestamptz not null default now()
);

-- ---------- NOTIFICATION RULES ----------
create table if not exists notification_rules (
  id         uuid primary key default gen_random_uuid(),
  type       notif_type not null,
  threshold  jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- INDEXES ----------
create index if not exists idx_deposits_created   on deposits(created_at desc);
create index if not exists idx_deposits_link       on deposits(link_id) where is_deleted = false;
create index if not exists idx_deposits_user       on deposits(user_id);
create index if not exists idx_withdrawals_created on withdrawals(created_at desc);
create index if not exists idx_withdrawals_link    on withdrawals(link_id) where is_deleted = false;
create index if not exists idx_audit_created       on audit_logs(created_at desc);

-- ============================================================
--  Aggregation view: today's stats per link (project timezone)
--  NOTE: uses Europe/Moscow as project day boundary.
-- ============================================================
create or replace view link_today_stats as
select
  l.id                                   as link_id,
  l.name,
  l.geo_id,
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
