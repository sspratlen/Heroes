-- ============================================================
-- HEROES SENIOR SOFTBALL — Auth / Profiles Setup
-- Run this entire file in your Supabase SQL Editor
-- (Project → SQL Editor → New query → paste → Run)
--
-- Prerequisites: Supabase Auth must be enabled (it is by default).
--   Run supabase-setup.sql first to create the heroes_data table.
--
-- Role hierarchy:
--   admin    — full access to everything
--   manager  — can edit data, manage players / roster
--   coach    — team-scoped: can view admin panel for their team only
--   player   — authenticated but limited; default for new sign-ups
--   (fans are the unauthenticated public)
-- ============================================================


-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
-- One profile row per auth user.  Created automatically by the
-- handle_new_user() trigger below whenever someone signs up.

CREATE TABLE IF NOT EXISTS profiles (
  -- Primary key mirrors auth.users.id so joins are free
  id              uuid        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,

  email           text        NOT NULL,

  -- Friendly display name; falls back to the email prefix if not supplied
  display_name    text,

  -- Role controls what the user can do inside the app
  role            text        NOT NULL DEFAULT 'player'
                              CHECK (role IN ('admin', 'manager', 'coach', 'player')),

  -- Coaches are scoped to one team (e.g. '55s-aaa').
  -- NULL for admin / manager / player.
  team_id         text,

  -- Optional soft-link to a player record in the heroes_data JSON.
  -- Stores the player's id string (e.g. 'p17').
  player_id       text,

  -- New accounts start as unapproved. An admin must flip this to true
  -- before the account gains any meaningful site privileges.
  approved        boolean     NOT NULL DEFAULT false,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Index for quick look-ups by email (used in admin search)
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles (email);

-- Index for coach-scoped queries
CREATE INDEX IF NOT EXISTS profiles_team_id_idx ON profiles (team_id);


-- ============================================================
-- 2. AUTO-UPDATE updated_at ON EVERY ROW CHANGE
-- ============================================================
-- Re-use (or re-create) the same trigger function used by heroes_data,
-- but give it a distinct name so the two tables don't conflict.

CREATE OR REPLACE FUNCTION set_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_profile_updated_at();


-- ============================================================
-- 3. TRIGGER: AUTO-INSERT PROFILE ON AUTH SIGN-UP
-- ============================================================
-- Every time a new row appears in auth.users (i.e. someone signs
-- up via sb.auth.signUp), this trigger fires and creates the
-- matching profile with safe defaults:
--   • role    = 'player'
--   • approved = false  (admin must approve before the account works)
--
-- The trigger is SECURITY DEFINER so it runs with the privileges
-- of the function owner (postgres), not the signing-up user —
-- which is necessary because new users don't yet have INSERT
-- rights on profiles at the moment the trigger fires.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    role,
    approved
  )
  VALUES (
    NEW.id,
    NEW.email,

    -- Prefer the display_name the client passed in signUp options.data,
    -- otherwise fall back to the portion of the email before the @.
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
      split_part(NEW.email, '@', 1)
    ),

    'player',   -- every new account starts as a plain player
    false       -- must be approved by an admin before gaining access
  );
  RETURN NEW;
END;
$$;

-- Attach the function to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================
-- NOTE: These policies are intentionally permissive for the staging
-- environment.  The application JavaScript layer (HeroesAuth / admin
-- panel) enforces role checks and the approval gate.  This mirrors the
-- same pattern used for the heroes_data table in supabase-setup.sql.
--
-- TODO before production: replace the USING(true) policies below with
-- proper role-based policies, e.g.:
--   SELECT — allow authenticated users to read their own row; allow
--             admin/manager to read all rows.
--   UPDATE — allow a user to update their own display_name; allow
--             admin/manager to update role, approved, team_id.
--   INSERT — remove entirely (the trigger handles inserts).
--   DELETE — admin only.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop any previously created policies so this file is idempotent
DROP POLICY IF EXISTS "profiles_read"   ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;

-- Permissive staging policies (all operations, all rows)
CREATE POLICY "profiles_read"   ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (true);
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (true);


-- ============================================================
-- DONE
-- ============================================================
-- Your profiles table is ready.
-- Next steps:
--   1. Add auth.js to your HTML pages (after data.js).
--   2. Add an #auth-nav-slot element inside your <nav> if you want
--      the login button to appear there (auth.js injects it dynamically).
--   3. Go to Supabase → Authentication → Settings and configure
--      the Site URL to match your staging / production domain.
--   4. To promote a user to admin, run:
--        UPDATE profiles SET role = 'admin', approved = true
--        WHERE email = 'youremail@example.com';


-- ============================================================
-- VERIFICATION QUERIES (uncomment and run individually to check)
-- ============================================================

-- Check table structure
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
-- ORDER BY ordinal_position;

-- Check trigger is attached
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_name = 'on_auth_user_created';

-- Check RLS policies
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'profiles';

-- List all current profiles (run after sign-ups)
-- SELECT id, email, display_name, role, team_id, player_id, approved, created_at
-- FROM profiles
-- ORDER BY created_at DESC;

-- Promote a specific user to admin and approve them
-- UPDATE profiles
-- SET role = 'admin', approved = true
-- WHERE email = 'scottspratlen@gmail.com';
