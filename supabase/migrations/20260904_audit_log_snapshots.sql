-- Extend audit_log with before/after snapshots and display name
alter table audit_log
  add column if not exists previous_value jsonb,
  add column if not exists new_value      jsonb,
  add column if not exists changed_by     text;
