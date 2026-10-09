-- Lock down row-level security (2026-10-09)
--
-- Removes legacy wide-open policies (roles {public}, condition `true`) that let
-- anyone holding the public API key edit profiles (incl. making themselves
-- admin), the site data blob, players, teams and rosters. Replaces them with
-- staff-only writes plus narrow self-service rules for players.

-- ── Helpers (private schema: not reachable through the REST API) ──────────
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.approved
$$;

create or replace function private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.my_role() in ('admin', 'manager', 'coach'), false)
$$;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.my_role() = 'admin', false)
$$;

create or replace function private.is_approved() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.my_role() is not null
$$;

create or replace function private.my_player_id() returns text
language sql stable security definer set search_path = '' as $$
  select p.player_id from public.profiles p where p.id = auth.uid()
$$;

revoke all on function private.my_role(), private.is_staff(), private.is_admin(),
  private.is_approved(), private.my_player_id() from public;
grant execute on function private.my_role(), private.is_staff(), private.is_admin(),
  private.is_approved(), private.my_player_id() to anon, authenticated;

-- ── profiles ────────────────────────────────────────────────────────────
drop policy if exists profiles_read   on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists profiles_delete on public.profiles;

create policy "profiles: read own or staff" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_staff()));

create policy "profiles: update own or staff" on public.profiles
  for update to authenticated
  using      (id = (select auth.uid()) or (select private.is_staff()))
  with check (id = (select auth.uid()) or (select private.is_staff()));

-- Non-staff may edit their own profile, but not their role, approval or links.
create or replace function private.profiles_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    return new;  -- service role / dashboard
  end if;
  if not private.is_staff() and (
       new.id        is distinct from old.id
    or new.email     is distinct from old.email
    or new.role      is distinct from old.role
    or new.approved  is distinct from old.approved
    or new.player_id is distinct from old.player_id
    or new.team_id   is distinct from old.team_id) then
    raise exception 'You cannot change account role, approval, or player link'
      using errcode = '42501';
  end if;
  if new.role is distinct from old.role and 'admin' in (new.role, old.role)
     and not private.is_admin() then
    raise exception 'Only admins can grant or remove admin access'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.profiles_guard() from public, anon, authenticated;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function private.profiles_guard();

-- ── heroes_data (site content blob) ─────────────────────────────────────
drop policy if exists heroes_insert on public.heroes_data;
drop policy if exists heroes_update on public.heroes_data;
drop policy if exists heroes_delete on public.heroes_data;

create policy "heroes_data: staff write" on public.heroes_data
  for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

-- ── players ─────────────────────────────────────────────────────────────
drop policy if exists players_insert on public.players;
drop policy if exists players_update on public.players;

create policy "players: update own record" on public.players
  for update to authenticated
  using (
    lower(email) = lower((select auth.jwt()) ->> 'email')
    or legacy_id = (select private.my_player_id()))
  with check (
    lower(email) = lower((select auth.jwt()) ->> 'email')
    or legacy_id = (select private.my_player_id()));

-- Players editing their own record may only change these fields.
create or replace function private.players_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  editable constant text[] := array['position', 'bats', 'throws', 'photo', 'updated_at'];
begin
  if auth.uid() is null or private.is_staff() then
    return new;
  end if;
  if (to_jsonb(new) - editable) is distinct from (to_jsonb(old) - editable) then
    raise exception 'Players can only update position, bats, throws and photo'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.players_guard() from public, anon, authenticated;

drop trigger if exists players_guard on public.players;
create trigger players_guard before update on public.players
  for each row execute function private.players_guard();

-- ── teams / rosters / stats / orgs: staff only ──────────────────────────
drop policy if exists teams_insert                  on public.teams;
drop policy if exists teams_update                  on public.teams;
drop policy if exists "Allow authenticated deletes" on public.teams;
drop policy if exists player_teams_insert           on public.player_teams;
drop policy if exists player_teams_update           on public.player_teams;
drop policy if exists player_roles_insert           on public.player_roles;
drop policy if exists player_roles_update           on public.player_roles;
drop policy if exists player_stats_insert           on public.player_stats;
drop policy if exists player_stats_update           on public.player_stats;
drop policy if exists orgs_insert                   on public.organizations;
drop policy if exists orgs_update                   on public.organizations;

-- ── audit_log: staff only ───────────────────────────────────────────────
drop policy if exists "Authenticated users can insert audit entries" on public.audit_log;
create policy "audit_log: staff insert" on public.audit_log
  for insert to authenticated with check ((select private.is_staff()));

-- ── tournament_rsvps: players set their own answer; tokens stay private ─
create policy "rsvps: players insert own" on public.tournament_rsvps
  for insert to authenticated
  with check (player_id = (select auth.uid()) and (select private.is_approved()));

create policy "rsvps: players update own" on public.tournament_rsvps
  for update to authenticated
  using      (player_id = (select auth.uid()))
  with check (player_id = (select auth.uid()));

revoke select, insert, update, delete on public.tournament_rsvps from anon, authenticated;
grant select (id, tournament_id, player_id, status, responded_at, created_at)
  on public.tournament_rsvps to anon, authenticated;
grant insert (tournament_id, player_id, status, responded_at)
  on public.tournament_rsvps to authenticated;
grant update (tournament_id, player_id, status, responded_at)
  on public.tournament_rsvps to authenticated;

-- ── storage ─────────────────────────────────────────────────────────────
drop policy if exists "player-photos all access" on storage.objects;
drop policy if exists "team-photos access"       on storage.objects;

create policy "player/team photos: public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('player-photos', 'team-photos'));

create policy "player-photos: signed-in upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'player-photos' and (select private.is_approved()));

create policy "player/team photos: staff manage" on storage.objects
  for all to authenticated
  using      (bucket_id in ('player-photos', 'team-photos') and (select private.is_staff()))
  with check (bucket_id in ('player-photos', 'team-photos') and (select private.is_staff()));
