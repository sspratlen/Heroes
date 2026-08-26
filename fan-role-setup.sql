-- ============================================================
-- HEROES SENIOR SOFTBALL — Add 'fan' role
-- Run in Supabase SQL Editor (Project → SQL Editor → New query)
-- ============================================================
-- Postgres CHECK constraints can't be altered in place — drop
-- the old one and recreate it with 'fan' included.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'coach', 'player', 'fan'));
