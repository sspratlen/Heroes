-- Add onboarding fields to profiles
-- Run in Supabase SQL Editor → New Query

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS jersey_number       text,
  ADD COLUMN IF NOT EXISTS position            text,
  ADD COLUMN IF NOT EXISTS photo_url           text;
