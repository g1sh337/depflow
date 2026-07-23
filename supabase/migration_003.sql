-- ============================================================
--  Migration 003: free-form geos (any label, allow duplicates)
--  Run in Supabase SQL Editor. Idempotent.
-- ============================================================

-- Same country can exist for different advertisers → drop the unique code.
alter table geos drop constraint if exists geos_code_key;

-- Optional human name (advertiser note etc.); code stays the short label.
alter table geos add column if not exists name text;
