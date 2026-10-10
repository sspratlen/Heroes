-- Fan answers (I'm In / Maybe / Can't Go) for events on the Events page.
-- Roster players answer in event_attendance; everyone else answers here.
-- Each user manages only their own answer; coaches/managers/admins can read all. (2026-10-10)

create table if not exists public.event_fan_attendance (
  event_id   text not null,                 -- heroes_data events[].id
  user_id    uuid not null default auth.uid()
             references public.profiles(id) on delete cascade,
  status     text not null check (status in ('yes', 'maybe', 'no')),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.event_fan_attendance enable row level security;

create policy "event_fan_attendance: read own or staff" on public.event_fan_attendance
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));

create policy "event_fan_attendance: add own" on public.event_fan_attendance
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_approved()));

create policy "event_fan_attendance: change own" on public.event_fan_attendance
  for update to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select private.is_approved()));

create policy "event_fan_attendance: remove own" on public.event_fan_attendance
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.event_fan_attendance from anon, authenticated;
grant select, insert, update, delete on public.event_fan_attendance to authenticated;

-- Carry over existing "I'm attending" picks as "I'm In".
insert into public.event_fan_attendance (event_id, user_id, status)
select ev_id, f.user_id, 'yes'
from public.fan_preferences f,
     jsonb_array_elements_text(coalesce(f.attending, '[]'::jsonb)) ev_id
where exists (select 1 from public.profiles p where p.id = f.user_id)
on conflict (event_id, user_id) do nothing;
