-- Allow admins to read all fan preferences (needed for Supabase backup export)
create policy "Admins can read all fan preferences"
  on fan_preferences for select
  to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );
