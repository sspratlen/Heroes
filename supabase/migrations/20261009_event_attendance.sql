-- Player attendance (I'm In / Maybe / Can't Go) for events on the Tournaments page.
-- Replaces events[].availability inside the heroes_data blob, which players could
-- only write by overwriting the whole site data. (2026-10-09)

create table if not exists public.event_attendance (
  event_id   text not null,                 -- heroes_data events[].id
  player_id  text not null,                 -- roster id (players.legacy_id)
  status     text not null check (status in ('yes', 'maybe', 'no')),
  note       text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (event_id, player_id)
);
alter table public.event_attendance enable row level security;

-- True when the roster id belongs to the signed-in user (linked profile or matching email).
create or replace function private.is_my_player(pid text) returns boolean
language sql stable security definer set search_path = '' as $$
  select pid = private.my_player_id()
      or exists (select 1 from public.players pl
                 where pl.legacy_id = pid
                   and lower(pl.email) = lower(auth.jwt() ->> 'email'))
$$;
revoke all on function private.is_my_player(text) from public;
grant execute on function private.is_my_player(text) to anon, authenticated;

create policy "event_attendance: public read" on public.event_attendance
  for select to anon, authenticated using (true);

create policy "event_attendance: players add own" on public.event_attendance
  for insert to authenticated
  with check ((select private.is_approved()) and private.is_my_player(player_id));

create policy "event_attendance: players change own" on public.event_attendance
  for update to authenticated
  using      (private.is_my_player(player_id))
  with check ((select private.is_approved()) and private.is_my_player(player_id));

create policy "event_attendance: staff manage" on public.event_attendance
  for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

revoke all on public.event_attendance from anon, authenticated;
grant select on public.event_attendance to anon, authenticated;
grant insert, update, delete on public.event_attendance to authenticated;

-- Carry over answers already saved in the events blob.
insert into public.event_attendance (event_id, player_id, status, note)
select e ->> 'id', a ->> 'playerId', a ->> 'status', coalesce(a ->> 'note', '')
from public.heroes_data h,
     jsonb_array_elements(h.value) e,
     jsonb_array_elements(coalesce(e -> 'availability', '[]'::jsonb)) a
where h.collection = 'events'
  and a ->> 'playerId' is not null
  and a ->> 'status' in ('yes', 'maybe', 'no')
on conflict (event_id, player_id) do nothing;
