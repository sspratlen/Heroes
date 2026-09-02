-- Adds the groupme_token column to profiles.
-- Stores the user's GroupMe OAuth access token.
-- Empty string = not connected.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS groupme_token text DEFAULT '';
