-- Fan preferences: per-user attending events and favorite teams
-- Moved from localStorage (per-device) to Supabase (cross-device, persistent)
create table if not exists fan_preferences (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  attending  jsonb not null default '[]',
  favorites  jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

alter table fan_preferences enable row level security;

create policy "Users manage their own fan preferences"
  on fan_preferences for all
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
