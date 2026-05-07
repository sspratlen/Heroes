-- ============================================================
-- HEROES SENIOR SOFTBALL — Supabase Setup
-- Run this entire file in your Supabase SQL Editor
-- (Project → SQL Editor → New query → paste → Run)
-- ============================================================

-- 1. Create the data store table
CREATE TABLE IF NOT EXISTS heroes_data (
  collection  text        PRIMARY KEY,
  value       jsonb       NOT NULL,
  updated_at  timestamptz DEFAULT now()
);

-- 2. Auto-update the updated_at timestamp on every change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS heroes_data_updated_at ON heroes_data;
CREATE TRIGGER heroes_data_updated_at
  BEFORE UPDATE ON heroes_data
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Row Level Security — allow the website to read and write freely.
--    The app handles its own admin/player authentication.
ALTER TABLE heroes_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "heroes_read"   ON heroes_data;
DROP POLICY IF EXISTS "heroes_insert" ON heroes_data;
DROP POLICY IF EXISTS "heroes_update" ON heroes_data;
DROP POLICY IF EXISTS "heroes_delete" ON heroes_data;

CREATE POLICY "heroes_read"   ON heroes_data FOR SELECT USING (true);
CREATE POLICY "heroes_insert" ON heroes_data FOR INSERT WITH CHECK (true);
CREATE POLICY "heroes_update" ON heroes_data FOR UPDATE USING (true);
CREATE POLICY "heroes_delete" ON heroes_data FOR DELETE USING (true);

-- Done! Your table is ready.
-- Next: copy your Project URL and anon key from
-- Supabase → Settings → API  and paste them into assets/js/data.js
