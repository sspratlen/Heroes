-- Tournament RSVP tables
-- Run this in the Supabase SQL editor for project mpgbgucmnxowteonldoh

-- One row per player per tournament
CREATE TABLE IF NOT EXISTS tournament_rsvps (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  text NOT NULL,
  player_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token          uuid NOT NULL DEFAULT gen_random_uuid(),
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','yes','no','maybe')),
  responded_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, player_id),
  UNIQUE (token)
);

ALTER TABLE tournament_rsvps ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can read RSVPs — used by rsvp.html roster view
CREATE POLICY "anyone can read rsvps"
  ON tournament_rsvps FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin/manager/coach can update any RSVP (override dropdown in admin.html)
CREATE POLICY "admin can update rsvps"
  ON tournament_rsvps FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('admin','manager','coach')
  );

-- One row per tournament blast — stores snapshot for reminders
CREATE TABLE IF NOT EXISTS tournament_email_meta (
  tournament_id  text PRIMARY KEY,
  name           text NOT NULL,
  start_date     text NOT NULL,
  end_date       text,
  location       text,
  team_id        text NOT NULL,
  sent_at        timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tournament_email_meta ENABLE ROW LEVEL SECURITY;

-- Authenticated admin/manager/coach can read meta (to check if blast was sent)
CREATE POLICY "authenticated can read meta"
  ON tournament_email_meta FOR SELECT
  TO authenticated
  USING (true);
