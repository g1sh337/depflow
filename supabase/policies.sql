-- ============================================================
--  Row Level Security policies
--  Assumes Telegram auth issues a Supabase JWT whose `sub`
--  maps to users.id, with a custom claim `role`.
--  Helper: current_app_user_id() reads auth.uid().
-- ============================================================

alter table users               enable row level security;
alter table invite_keys         enable row level security;
alter table geos                enable row level security;
alter table links               enable row level security;
alter table deposits            enable row level security;
alter table withdrawals         enable row level security;
alter table expenses            enable row level security;
alter table audit_logs          enable row level security;
alter table notification_rules  enable row level security;

-- is the caller an admin?
create or replace function is_admin() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from users u
    where u.id = auth.uid() and u.role = 'admin' and u.is_active
  );
$$;

-- ---- READ: whole team sees shared operational data ----
create policy read_links       on links       for select using (true);
create policy read_geos        on geos        for select using (true);
create policy read_deposits    on deposits    for select using (is_deleted = false);
create policy read_withdrawals on withdrawals for select using (is_deleted = false);
create policy read_users       on users       for select using (true);

-- ---- WRITE deposits/withdrawals: any active user, tied to self ----
create policy insert_deposits on deposits for insert
  with check (auth.uid() = user_id);
create policy update_own_deposits on deposits for update
  using (auth.uid() = user_id or is_admin());

create policy insert_withdrawals on withdrawals for insert
  with check (auth.uid() = user_id);
create policy update_own_withdrawals on withdrawals for update
  using (auth.uid() = user_id or is_admin());

-- ---- ADMIN-ONLY: links, plans, invite keys, expenses, rules ----
create policy admin_links   on links   for all using (is_admin()) with check (is_admin());
create policy admin_geos    on geos    for all using (is_admin()) with check (is_admin());
create policy admin_keys    on invite_keys for all using (is_admin()) with check (is_admin());
create policy admin_expense on expenses for all using (is_admin()) with check (is_admin());
create policy admin_rules   on notification_rules for all using (is_admin()) with check (is_admin());

-- ---- AUDIT: readable by admin, insert by anyone (server) ----
create policy admin_read_audit on audit_logs for select using (is_admin());
create policy insert_audit      on audit_logs for insert with check (true);
