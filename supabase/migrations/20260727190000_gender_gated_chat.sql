-- Applied directly to the live project via the Supabase MCP tools; mirrored
-- here for documentation (see the divergence note in
-- 20260727180000_nearby_users_blocks_and_threads_foundation.sql).

-- Who is allowed to message me — per-user preference, not a hardcoded
-- app-wide rule (aligns with Apple/Google's UGC-safety expectations better
-- than a fixed rule the app would otherwise have to justify at review).
alter table public.profiles
  add column messaging_preference text not null default 'same_gender_only'
  check (messaging_preference in ('same_gender_only', 'anyone', 'no_one'));

-- Chat messages.
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index chat_messages_thread_id_idx on public.chat_messages (thread_id, created_at);

alter table public.chat_messages enable row level security;

create policy "chat_messages_select_participant"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_threads t
      where t.id = chat_messages.thread_id
        and (auth.uid() = t.user_a or auth.uid() = t.user_b)
    )
  );

create policy "chat_messages_insert_participant"
  on public.chat_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chat_threads t
      where t.id = chat_messages.thread_id
        and (auth.uid() = t.user_a or auth.uid() = t.user_b)
    )
  );

alter publication supabase_realtime add table public.chat_messages;

-- Baseline abuse mitigation: rate limit + keyword filter. Not a substitute
-- for report/block, just the expected floor.
create table public.blocked_keywords (
  keyword text primary key,
  created_at timestamptz not null default now()
);
alter table public.blocked_keywords enable row level security;
-- No policies: only readable via SECURITY DEFINER functions below (or the
-- dashboard/service role) — moderators extend this list without a deploy.
insert into public.blocked_keywords (keyword) values
  ('http://'), ('https://'), ('www.');

create or replace function public.enforce_chat_message_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
  hit_keyword boolean;
begin
  select count(*) into recent_count
  from public.chat_messages
  where sender_id = new.sender_id
    and created_at > now() - interval '1 minute';
  if recent_count >= 20 then
    raise exception 'You are sending messages too quickly. Please slow down.';
  end if;

  select exists (
    select 1 from public.blocked_keywords k
    where lower(new.body) like '%' || lower(k.keyword) || '%'
  ) into hit_keyword;
  if hit_keyword then
    raise exception 'Message blocked: contains disallowed content.';
  end if;

  return new;
end;
$$;

-- Trigger-only function — never meant to be callable directly via
-- /rest/v1/rpc/enforce_chat_message_limits (see the follow-up lockdown
-- migration for the REVOKE that Postgres's default PUBLIC grant needed).
revoke all on function public.enforce_chat_message_limits() from public;

create trigger chat_messages_enforce_limits
  before insert on public.chat_messages
  for each row
  execute function public.enforce_chat_message_limits();

-- Gender/preference-gated createOrGetThread — supersedes the block-only
-- version from the Nearby-users step. The RECIPIENT's messaging_preference
-- governs (whoever initiates, the other side's stated preference decides).
create or replace function public.create_or_get_thread(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  thread_id uuid;
  me uuid := auth.uid();
  my_gender text;
  their_gender text;
  their_preference text;
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

  select gender into my_gender from public.profiles where id = me;
  select gender, messaging_preference into their_gender, their_preference
  from public.profiles where id = other_user_id;

  if their_preference = 'no_one' then
    raise exception 'This user is not accepting messages right now';
  end if;

  if their_preference = 'same_gender_only'
     and (my_gender is null or their_gender is null or my_gender <> their_gender) then
    raise exception 'This user only accepts messages from the same gender';
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

-- Block immediately hides the thread for both sides (createOrGetThread
-- already prevents new ones between blocked pairs).
drop policy "chat_threads_select_participant" on public.chat_threads;
create policy "chat_threads_select_participant"
  on public.chat_threads for select
  using (
    (auth.uid() = user_a or auth.uid() = user_b)
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = user_a and b.blocked_id = user_b)
         or (b.blocker_id = user_b and b.blocked_id = user_a)
    )
  );

-- Read receipts + mute, set via SECURITY DEFINER functions rather than a
-- generic UPDATE policy (which would let a participant tamper with the
-- other side's columns, or the user_a/user_b pairing itself).
alter table public.chat_threads
  add column last_read_a timestamptz,
  add column last_read_b timestamptz,
  add column muted_by_a boolean not null default false,
  add column muted_by_b boolean not null default false;

create or replace function public.mark_thread_read(p_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  update public.chat_threads
  set last_read_a = case when user_a = me then now() else last_read_a end,
      last_read_b = case when user_b = me then now() else last_read_b end
  where id = p_thread_id and (user_a = me or user_b = me);
end;
$$;

create or replace function public.set_thread_muted(p_thread_id uuid, p_muted boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  update public.chat_threads
  set muted_by_a = case when user_a = me then p_muted else muted_by_a end,
      muted_by_b = case when user_b = me then p_muted else muted_by_b end
  where id = p_thread_id and (user_a = me or user_b = me);
end;
$$;

revoke all on function public.mark_thread_read(uuid) from public;
grant execute on function public.mark_thread_read(uuid) to authenticated;
revoke all on function public.set_thread_muted(uuid, boolean) from public;
grant execute on function public.set_thread_muted(uuid, boolean) to authenticated;
