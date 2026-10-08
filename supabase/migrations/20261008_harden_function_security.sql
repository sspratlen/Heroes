-- Fix Supabase security advisor warnings (applied 2026-10-08)

-- Trigger / event-trigger functions: never meant to be called via the REST API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Pin search_path on updated_at trigger functions.
alter function public.set_updated_at() set search_path = '';
alter function public.set_profile_updated_at() set search_path = '';
