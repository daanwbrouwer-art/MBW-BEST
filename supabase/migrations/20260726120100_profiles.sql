-- One row per auth.users account: identity + coarse-location discovery fields.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  email text,
  gender text,
  last_active_at timestamptz,
  discoverable boolean not null default false,
  last_lat double precision,
  last_lng double precision,
  updated_at timestamptz not null default now()
);

-- Generated geography point, kept in sync from last_lat/last_lng, indexed for
-- ST_DWithin "who's near me" queries (see nearby_profiles() below).
alter table public.profiles
  add column location geography(Point, 4326) generated always as (
    case
      when last_lat is not null and last_lng is not null
        then ST_SetSRID(ST_MakePoint(last_lng, last_lat), 4326)::geography
      else null
    end
  ) stored;

create index profiles_location_gix on public.profiles using gist (location);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- Self access only on the raw table. Other users' coarse location/identity is
-- exposed exclusively through the discoverable_profiles view and the
-- nearby_profiles() function (both defined in later migrations), never here.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
