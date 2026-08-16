-- Coarse public view of profiles: only non-sensitive columns, only rows that
-- opted into discoverable = true. Views run with the privileges of their
-- owner (the migration role, which owns `profiles` and therefore bypasses
-- its RLS) rather than the querying user's, so this is the sanctioned way to
-- expose a filtered slice of an RLS-locked table without a public policy on
-- the raw table itself.
create view public.discoverable_profiles as
  select id, username, gender, last_active_at, last_lat, last_lng
  from public.profiles
  where discoverable = true;

grant select on public.discoverable_profiles to authenticated;
