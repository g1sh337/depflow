-- ============================================================
--  Seed data: geos + a few starter links.
--  Run AFTER schema.sql. Idempotent (safe to re-run).
-- ============================================================

insert into geos (code, flag_emoji, sort_order) values
  ('RU1', '🇷🇺', 1),
  ('RU2', '🇷🇺', 2),
  ('RU3', '🇷🇺', 3),
  ('EG',  '🇪🇬', 4),
  ('KZ',  '🇰🇿', 5),
  ('UZ',  '🇺🇿', 6),
  ('IN',  '🇮🇳', 7)
on conflict (code) do nothing;

-- Starter links (edit plans later in the app / admin).
insert into links (name, geo_id, plan_count, plan_amount, amount_presets)
select v.name, g.id, v.plan_count, v.plan_amount, v.presets::jsonb
from (values
  ('RU1', 'RU1', 10, 500, '[15,25,50,100]'),
  ('RU2', 'RU2', 10, 500, '[15,25,50,100]'),
  ('EG',  'EG',  15, 450, '[10,20,30,50]'),
  ('KZ',  'KZ',  12, 400, '[15,30,60]')
) as v(name, geo_code, plan_count, plan_amount, presets)
join geos g on g.code = v.geo_code
where not exists (select 1 from links l where l.name = v.name);
