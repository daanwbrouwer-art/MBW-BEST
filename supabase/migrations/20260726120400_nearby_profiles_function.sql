-- "Who's near me": discoverable profiles within radius_km of (lat, lng),
-- excluding the caller, nearest first. security definer for the same reason
-- as discoverable_profiles — it needs to read rows the caller's own RLS
-- policy on `profiles` would otherwise hide.
create or replace function public.nearby_profiles(lat double precision, lng double precision, radius_km double precision)
returns table (
  id uuid,
  username text,
  gender text,
  last_active_at timestamptz,
  last_lat double precision,
  last_lng double precision,
  distance_km double precision
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.username,
    p.gender,
    p.last_active_at,
    p.last_lat,
    p.last_lng,
    ST_Distance(p.location, geography(ST_SetSRID(ST_MakePoint(lng, lat), 4326))) / 1000.0 as distance_km
  from public.profiles p
  where p.discoverable = true
    and p.id <> auth.uid()
    and p.location is not null
    and ST_DWithin(p.location, geography(ST_SetSRID(ST_MakePoint(lng, lat), 4326)), radius_km * 1000.0)
  order by distance_km asc;
$$;

revoke all on function public.nearby_profiles(double precision, double precision, double precision) from public;
grant execute on function public.nearby_profiles(double precision, double precision, double precision) to authenticated;
