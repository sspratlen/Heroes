-- Audit log: records who changed what on the admin side
create table if not exists audit_log (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  user_email   text,
  user_id      uuid references auth.users(id) on delete set null,
  action       text not null,
  collection   text,
  record_id    text,
  summary      text
);

-- Index for fast recent-first queries
create index if not exists audit_log_created_at_idx on audit_log (created_at desc);

-- RLS: admins can read all rows; authenticated users can insert their own rows
alter table audit_log enable row level security;

create policy "Admins can read audit log"
  on audit_log for select
  to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Authenticated users can insert audit entries"
  on audit_log for insert
  to authenticated
  with check (auth.uid() = user_id);
