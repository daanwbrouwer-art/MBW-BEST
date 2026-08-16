-- Applied directly to the live project (wiowzwkowbilpjgbemsq) via the
-- Supabase MCP tools; mirrored here so local migrations don't drift further.
-- NOTE: this repo's local /supabase/migrations history and the live
-- project's actual applied migrations have already diverged before this
-- file (the live project also has map_parks_foundation /
-- nearby_parks_fix_search_path / parks_add_source_column, applied directly
-- and never written back here) — treat the live database as source of
-- truth, this folder as best-effort documentation, until that's reconciled.

-- Blocks: one-directional, checked both ways everywhere it matters.
create table public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy "blocks_select_own"
  on public.blocks for select
  using (auth.uid() = blocker_id);

create policy "blocks_insert_own"
  on public.blocks for insert
  to authenticated
  with check (auth.uid() = blocker_id);

create policy "blocks_delete_own"
  on public.blocks for delete
  using (auth.uid() = blocker_id);

-- Chat threads: bare table now (createOrGetThread needs somewhere to write),
-- messages/realtime/gender-gating are a separate follow-up.
create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint chat_threads_distinct_users check (user_a <> user_b)
);

create unique index chat_threads_unique_pair_idx
  on public.chat_threads (least(user_a, user_b), greatest(user_a, user_b));

alter table public.chat_threads enable row level security;

create policy "chat_threads_select_participant"
  on public.chat_threads for select
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "chat_threads_insert_participant"
  on public.chat_threads for insert
  to authenticated
  with check (auth.uid() = user_a or auth.uid() = user_b);

-- "Who's nearby": discoverable profiles within radius_km of (lat,lng),
-- excluding the caller and anyone blocked in either direction, active in
-- the last 48h. security definer: needs to read other users' profiles rows
-- (RLS on profiles otherwise only allows a user to read their own row) and
-- the blocks table across both users, without exposing either table raw.
create or replace function public.nearby_profiles(lat double precision, lng double precision, radius_km double precision)
returns table (
  id uuid,
  username text,
  gender text,
  last_active_at timestamptz,
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
    ST_Distance(
      geography(ST_SetSRID(ST_MakePoint(p.last_lng, p.last_lat), 4326)),
      geography(ST_SetSRID(ST_MakePoint(lng, lat), 4326))
    ) / 1000.0 as distance_km
  from public.profiles p
  where p.discoverable = true
    and p.id <> auth.uid()
    and p.last_lat is not null
    and p.last_lng is not null
    and p.last_active_at is not null
    and p.last_active_at > now() - interval '48 hours'
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
    and ST_DWithin(
      geography(ST_SetSRID(ST_MakePoint(p.last_lng, p.last_lat), 4326)),
      geography(ST_SetSRID(ST_MakePoint(lng, lat), 4326)),
      radius_km * 1000.0
    )
  order by distance_km asc
  limit 100;
$$;

revoke all on function public.nearby_profiles(double precision, double precision, double precision) from public;
grant execute on function public.nearby_profiles(double precision, double precision, double precision) to authenticated;

-- createOrGetThread: finds or creates the thread between the caller and
-- other_user_id. No gender-preference gating yet — just the block check,
-- which is real and enforced today.
create or replace function public.create_or_get_thread(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  thread_id uuid;
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;
  if me = other_user_id then
    raise exception 'Cannot start a thread with yourself';
  end if;
  if exists (
    select 1 from public.blocks
    where (blocker_id = me and blocked_id = other_user_id)
       or (blocker_id = other_user_id and blocked_id = me)
  ) then
    raise exception 'Cannot message this user';
  end if;

  select id into thread_id from public.chat_threads
  where (user_a = me and user_b = other_user_id)
     or (user_a = other_user_id and user_b = me)
  limit 1;

  if thread_id is null then
    insert into public.chat_threads (user_a, user_b) values (me, other_user_id)
    returning id into thread_id;
  end if;

  return thread_id;
end;
$$;

revoke all on function public.create_or_get_thread(uuid) from public;
grant execute on function public.create_or_get_thread(uuid) to authenticated;
