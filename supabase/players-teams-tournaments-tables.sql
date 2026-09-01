-- =============================================================
-- Heroes Website — Players / Teams / Tournaments migration
-- Apply via: Supabase MCP apply_migration OR Supabase SQL Editor
--
-- NOTE: teams, players, player_teams already exist with UUID PKs
--       and legacy_id text columns. This file:
--   1. Adds missing columns to teams (manager, assistant_manager)
--   2. Creates the tournaments table (team_id uuid → teams.id)
--   3. Adds RLS policies to all four tables
--   4. Adds FK from tournament_rsvps.tournament_id → tournaments.id
-- =============================================================

-- ─── 1. Add missing columns to teams ──────────────────────────
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS manager           text DEFAULT '',
  ADD COLUMN IF NOT EXISTS assistant_manager text DEFAULT '';

-- ─── 2. Create tournaments table ──────────────────────────────
CREATE TABLE IF NOT EXISTS tournaments (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  team_id     uuid REFERENCES teams(id) ON DELETE SET NULL,
  start_date  text,
  end_date    text,
  location    text DEFAULT '',
  season      int,
  placement   text,
  notes       text DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── 3. RLS — teams ───────────────────────────────────────────
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'teams' AND policyname = 'public read teams'
  ) THEN
    CREATE POLICY "public read teams" ON teams
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'teams' AND policyname = 'admin write teams'
  ) THEN
    CREATE POLICY "admin write teams" ON teams
      FOR ALL TO authenticated
      USING   ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'))
      WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'));
  END IF;
END $$;

-- ─── 4. RLS — players ─────────────────────────────────────────
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'players' AND policyname = 'public read players'
  ) THEN
    CREATE POLICY "public read players" ON players
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'players' AND policyname = 'admin write players'
  ) THEN
    CREATE POLICY "admin write players" ON players
      FOR ALL TO authenticated
      USING   ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'))
      WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'));
  END IF;
END $$;

-- ─── 5. RLS — player_teams ────────────────────────────────────
ALTER TABLE player_teams ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'player_teams' AND policyname = 'public read player_teams'
  ) THEN
    CREATE POLICY "public read player_teams" ON player_teams
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'player_teams' AND policyname = 'admin write player_teams'
  ) THEN
    CREATE POLICY "admin write player_teams" ON player_teams
      FOR ALL TO authenticated
      USING   ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'))
      WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'));
  END IF;
END $$;

-- ─── 6. RLS — tournaments ─────────────────────────────────────
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read tournaments" ON tournaments
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin write tournaments" ON tournaments
  FOR ALL TO authenticated
  USING   ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','coach'));

-- ─── 7. FK: tournament_rsvps → tournaments ────────────────────
-- tournament_rsvps.tournament_id is text; tournaments.id is text — compatible.
ALTER TABLE tournament_rsvps
  ADD CONSTRAINT IF NOT EXISTS fk_rsvps_tournament
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;

-- ─── 8. Expose new tables to Data API ─────────────────────────
GRANT SELECT ON tournaments TO anon, authenticated;
GRANT ALL    ON tournaments TO authenticated;
