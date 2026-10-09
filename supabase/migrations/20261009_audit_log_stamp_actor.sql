-- Stamp who made each audit entry from the authenticated session, so it can't
-- be missing or spoofed by the client. Inserts with no session (service role /
-- Edge Functions) keep whatever values they supplied.  (applied 2026-10-09)
create schema if not exists private;

create or replace function private.audit_log_set_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_name  text;
  v_email text;
begin
  if v_uid is null then
    return new;
  end if;

  select p.display_name, p.email into v_name, v_email
  from public.profiles p
  where p.id = v_uid;

  new.user_id    := v_uid;
  new.user_email := coalesce(v_email, auth.jwt() ->> 'email', 'unknown');
  new.changed_by := coalesce(nullif(trim(v_name), ''), v_email, auth.jwt() ->> 'email');
  return new;
end;
$$;

revoke all on function private.audit_log_set_actor() from public, anon, authenticated;

create trigger audit_log_set_actor
  before insert on public.audit_log
  for each row execute function private.audit_log_set_actor();
