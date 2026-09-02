ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS player_id    uuid REFERENCES players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pending_team text DEFAULT '';
