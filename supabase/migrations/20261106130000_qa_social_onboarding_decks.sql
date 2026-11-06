-- QA fixes before the closed test (2026-11-06).
--
-- 1. Usernames: unique (case-insensitive), neutral default instead of the
--    email's local part, and the sign-up trigger never silently skips the
--    profile on a clash.
-- 2. Username lookups for other users. profiles is readable only by its
--    owner (20261102120000_security_hardening), which broke Add friend,
--    party member names and friend lists. These two functions return only
--    id + username, and only for people the caller is connected to.
-- 3. Onboarding answers on the account, so a new phone or reinstall doesn't
--    ask the questionnaire again. Body measurements (weight, height, age)
--    are deliberately NOT stored here: the privacy policy says they stay on
--    the device. The client strips them before writing.
-- 4. custom_decks: saved Build-Your-Own decks, synced per account.

-- ─── 1. Usernames ───────────────────────────────────────────────────────

-- Rename accounts whose username is the email-derived fallback (the user
-- never chose it), so other users stop seeing part of their email address.
update public.profiles p
set username = 'athlete_' || lpad((floor(random() * 1000000))::int::text, 6, '0')
from auth.users u
where u.id = p.id
  and p.username = split_part(u.email, '@', 1)
  and coalesce(u.raw_user_meta_data->>'username', '') = '';

-- The two Play Console reviewer accounts get fixed, friendly names, so the
-- review notes can say "add reviewer_two as a friend". Skipped if somebody
-- else already holds the name.
update public.profiles p
set username = v.name
from auth.users u,
  (values ('mybodyweight+playreview@outlook.com', 'reviewer_one'),
          ('mybodyweight+playreview2@outlook.com', 'reviewer_two')) as v(email, name)
where u.id = p.id
  and lower(u.email) = v.email
  and not exists (
    select 1 from public.profiles q
    where lower(q.username) = v.name and q.id <> p.id
  );

-- Resolve any case-insensitive duplicates before the unique index (none at
-- the time of writing, but keep the migration safe to replay).
update public.profiles p
set username = p.username || '_' || substr(replace(p.id::text, '-', ''), 1, 4)
where exists (
  select 1 from public.profiles q
  where lower(q.username) = lower(p.username) and q.id < p.id
);

create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));

-- Same rule the sign-up form enforces (letters, digits, underscore), so a
-- direct API update can't create look-alike names such as " bob". Any
-- existing name that breaks it gets a neutral default first, so every row
-- passes and routine updates (activity pings) never start failing.
update public.profiles
set username = 'athlete_' || substr(replace(id::text, '-', ''), 1, 24)
where username is null or username !~ '^[A-Za-z0-9_]{3,32}$';

-- A NULL would pass the CHECK below (NULL ~ regex is NULL), and the lookup
-- functions promise a name.
alter table public.profiles alter column username set not null;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[A-Za-z0-9_]{3,32}$');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wanted text := btrim(coalesce(new.raw_user_meta_data->>'username', ''));
  v_name text;
  v_try int := 0;
begin
  -- Only accept a requested name that meets the username rule (max 20 so a
  -- "_NNNN" suffix still fits in 32); otherwise use a neutral default.
  if v_wanted !~ '^[A-Za-z0-9_]{3,20}$' then
    v_wanted := null;
  end if;
  v_name := coalesce(v_wanted, 'athlete_' || lpad((floor(random() * 1000000))::int::text, 6, '0'));
  loop
    begin
      insert into public.profiles (id, username) values (new.id, v_name)
      on conflict (id) do nothing;
      exit;
    exception when unique_violation then
      v_try := v_try + 1;
      if v_try > 6 then
        -- Fail the sign-up loudly rather than leave an account without a
        -- profile. Unreachable in practice: the last name is id-derived.
        raise exception 'handle_new_user: could not assign a username for %', new.id;
      elsif v_try > 5 then
        v_name := 'athlete_' || substr(replace(new.id::text, '-', ''), 1, 24);
      else
        v_name := coalesce(v_wanted, 'athlete') || '_' || lpad((floor(random() * 10000))::int::text, 4, '0');
      end if;
    end;
  end loop;
  return new;
end;
$$;

-- Lets the sign-up form say "That username is taken" before creating the
-- account. Returns only a boolean.
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(btrim(p_username), '') ~ '^[A-Za-z0-9_]{3,20}$'
    and not exists (
      select 1 from public.profiles where lower(username) = lower(btrim(p_username))
    );
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- ─── 2. Username lookups ────────────────────────────────────────────────

-- Exact (case-insensitive) username match for Add friend. Never returns the
-- caller, or anyone in a block relationship with the caller.
create or replace function public.find_profile_by_username(p_username text)
returns table (id uuid, username text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username
  from public.profiles p
  where auth.uid() is not null
    -- Anonymous (guest) sessions exist only for park submissions.
    and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
    and lower(p.username) = lower(btrim(p_username))
    and p.id <> auth.uid()
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
  limit 1;
$$;
revoke all on function public.find_profile_by_username(text) from public;
revoke execute on function public.find_profile_by_username(text) from anon;
grant execute on function public.find_profile_by_username(text) to authenticated;

-- Usernames for a list of ids, filtered to people the caller is genuinely
-- connected to. Rows a user can create on their own (a friend request to
-- anyone, a pending party invite) must not reveal a stranger's name, so:
--  - friendships count unless declined, and friend requests can only be
--    created through send_friend_request(username) below, i.e. by someone
--    who already knows the name;
--  - in a party, the other person counts only if they are the host or have
--    accepted (a pending invitee is not "connected" yet);
--  - nobody gets the name of a user who has blocked them.
-- A chat thread alone does NOT count: create_or_get_thread() accepts any id
-- the caller can see (e.g. a co-invitee of a party), so it must not unlock
-- names here. Chat screens get the peer's name from get_my_threads() and
-- get_thread_peer() instead.
-- At most 200 ids per call; the client sends larger lists in chunks.
create or replace function public.get_usernames(p_ids uuid[])
returns table (id uuid, username text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    return;
  end if;
  if cardinality(p_ids) > 200 then
    raise exception 'get_usernames: at most 200 ids per call';
  end if;
  return query
  select p.id, p.username
  from public.profiles p
  where p.id = any (p_ids)
    and (
      p.id = me
      or (
        not exists (
          select 1 from public.blocks b
          where b.blocker_id = p.id and b.blocked_id = me
        )
        and (
          exists (
            select 1 from public.friendships f
            where f.status <> 'declined'
              and ((f.requester_id = me and f.addressee_id = p.id)
                or (f.addressee_id = me and f.requester_id = p.id))
          )
          or exists (
            select 1
            from public.train_together_sessions s
            where (s.host_id = p.id or exists (
                    select 1 from public.train_together_session_participants x
                    where x.session_id = s.id and x.user_id = p.id
                      and x.invite_status = 'accepted'))
              and (s.host_id = me or exists (
                    select 1 from public.train_together_session_participants y
                    where y.session_id = s.id and y.user_id = me
                      and y.invite_status <> 'declined'))
          )
        )
      )
    );
end;
$$;
revoke all on function public.get_usernames(uuid[]) from public;
revoke execute on function public.get_usernames(uuid[]) from anon;
grant execute on function public.get_usernames(uuid[]) to authenticated;

-- Friend requests go through this function, by username only. It accepts
-- an existing incoming request instead of creating a second one, refuses
-- blocked pairs, and returns 'sent' or 'accepted'. Direct inserts into
-- friendships are no longer allowed (see the revoke below), so a request
-- can't be aimed at a raw user id to fish for that user's name.
create or replace function public.send_friend_request(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  them uuid;
  existing record;
begin
  if me is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Not authenticated';
  end if;
  select p.id into them
  from public.profiles p
  where lower(p.username) = lower(btrim(p_username))
    and p.id <> me
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = me and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = me)
    );
  if them is null then
    raise exception 'No user found with that username.';
  end if;

  for existing in
    select f.id, f.requester_id, f.status
    from public.friendships f
    where (f.requester_id = me and f.addressee_id = them)
       or (f.requester_id = them and f.addressee_id = me)
    for update
  loop
    if existing.status = 'accepted' then
      raise exception 'You''re already friends.';
    end if;
    -- They asked me (still pending, or I declined earlier and changed my
    -- mind): accept their request.
    if existing.requester_id = them then
      update public.friendships set status = 'accepted' where id = existing.id;
      return 'accepted';
    end if;
    if existing.requester_id = me and existing.status = 'declined' then
      raise exception 'This person isn''t accepting your request right now.';
    end if;
    if existing.requester_id = me then
      raise exception 'You''ve already sent this person a request.';
    end if;
  end loop;

  begin
    insert into public.friendships (requester_id, addressee_id)
    values (me, them);
  exception when unique_violation then
    -- Their request (or my own double tap) landed in the meantime.
    update public.friendships set status = 'accepted'
    where requester_id = them and addressee_id = me and status <> 'accepted';
    if found then
      return 'accepted';
    end if;
    raise exception 'You''ve already sent this person a request.';
  end;
  return 'sent';
end;
$$;
revoke all on function public.send_friend_request(text) from public;
revoke execute on function public.send_friend_request(text) from anon;
grant execute on function public.send_friend_request(text) to authenticated;

drop policy if exists friendships_insert_as_requester on public.friendships;
revoke insert on public.friendships from authenticated, anon;

-- ─── 3. Onboarding on the account ───────────────────────────────────────

alter table public.profiles
  add column if not exists onboarding jsonb,
  add column if not exists onboarding_completed_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_onboarding_shape;
alter table public.profiles
  add constraint profiles_onboarding_shape check (
    onboarding is null
    or (jsonb_typeof(onboarding) = 'object'
        and octet_length(onboarding::text) <= 4000
        and not (onboarding ?| array['weightKg', 'heightCm', 'age']))
  );

grant select (onboarding, onboarding_completed_at) on public.profiles to authenticated;
grant update (onboarding, onboarding_completed_at) on public.profiles to authenticated;

-- ─── 4. Custom decks ────────────────────────────────────────────────────

create table if not exists public.custom_decks (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  exercises jsonb not null check (
    jsonb_typeof(exercises) = 'array'
    and jsonb_array_length(exercises) between 1 and 200
    and octet_length(exercises::text) <= 40000
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists custom_decks_user_id_idx on public.custom_decks (user_id);

alter table public.custom_decks enable row level security;

drop policy if exists custom_decks_select_own on public.custom_decks;
create policy custom_decks_select_own on public.custom_decks
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists custom_decks_insert_own on public.custom_decks;
create policy custom_decks_insert_own on public.custom_decks
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists custom_decks_update_own on public.custom_decks;
create policy custom_decks_update_own on public.custom_decks
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists custom_decks_delete_own on public.custom_decks;
create policy custom_decks_delete_own on public.custom_decks
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.custom_decks from anon, authenticated;
grant select, insert, update, delete on public.custom_decks to authenticated;

-- At most 100 saved decks per account. An upsert of an existing deck is an
-- edit, not a new deck (BEFORE INSERT triggers fire for upserts too). The
-- per-user advisory lock stops two parallel inserts both passing at 99.
create or replace function public.custom_decks_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.custom_decks where id = new.id) then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('custom_decks:' || new.user_id::text));
  if (select count(*) from public.custom_decks where user_id = new.user_id) >= 100 then
    raise exception 'You can save up to 100 custom decks' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke all on function public.custom_decks_limit() from public, anon, authenticated;
drop trigger if exists custom_decks_limit on public.custom_decks;
create trigger custom_decks_limit before insert on public.custom_decks
  for each row execute function public.custom_decks_limit();

-- Account deletion also removes saved decks (the auth.users cascade covers
-- it too; this keeps the function's explicit list complete).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from chat_threads where user_a = v_uid or user_b = v_uid;

  delete from train_together_sessions where host_id = v_uid;
  delete from train_together_session_participants where user_id = v_uid;
  update train_together_sessions
    set current_card_owner_id = null
    where current_card_owner_id = v_uid;

  delete from blocks where blocker_id = v_uid or blocked_id = v_uid;
  delete from reports where reporter_id = v_uid or reported_id = v_uid;
  delete from friendships where requester_id = v_uid or addressee_id = v_uid;
  delete from workout_history where user_id = v_uid;
  delete from custom_decks where user_id = v_uid;

  update park_photos set uploaded_by = null where uploaded_by = v_uid;
  update parks set submitted_by = null where submitted_by = v_uid;

  delete from profiles where id = v_uid;

  delete from auth.users where id = v_uid;
end;
$$;

-- ─── 5. Chat and parties: no name fishing by user id ──────────────────────
--
-- Chat threads return the other person's username (get_my_threads,
-- get_thread_peer), so starting a thread with a raw user id used to turn
-- any id the caller could see (e.g. a co-invitee of a party) into a name.
-- A new thread now needs a reason the caller may know the person: they are
-- discoverable (Nearby athletes, which already shows their name), an
-- accepted friend, or in an active party with the caller (host or
-- accepted). Existing threads keep working. Guests (anonymous sessions)
-- can't chat or join parties. Blocked pairs drop out of the thread list.

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
  their_discoverable boolean;
begin
  if me is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
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

  select gender into my_gender from public.profiles where id = me;
  select gender, messaging_preference, discoverable
    into their_gender, their_preference, their_discoverable
  from public.profiles where id = other_user_id;

  if thread_id is null and not (
    coalesce(their_discoverable, false)
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = me and f.addressee_id = other_user_id)
          or (f.addressee_id = me and f.requester_id = other_user_id))
    )
    or exists (
      select 1 from public.train_together_sessions s
      where (s.host_id = me or exists (
              select 1 from public.train_together_session_participants x
              where x.session_id = s.id and x.user_id = me
                and x.invite_status = 'accepted'))
        and (s.host_id = other_user_id or exists (
              select 1 from public.train_together_session_participants y
              where y.session_id = s.id and y.user_id = other_user_id
                and y.invite_status = 'accepted'))
    )
  ) then
    -- Same message as a refusal by preference: says nothing about the user.
    raise exception 'Cannot message this user';
  end if;

  if their_preference = 'no_one' then
    raise exception 'This user is not accepting messages right now';
  end if;
  if their_preference = 'same_gender_only'
     and (my_gender is null or their_gender is null or my_gender <> their_gender) then
    -- Deliberately vague: the old wording revealed the recipient's gender.
    raise exception 'This user is not accepting messages from you';
  end if;

  if thread_id is null then
    insert into public.chat_threads (user_a, user_b) values (me, other_user_id)
    returning id into thread_id;
  end if;

  return thread_id;
end;
$$;

create or replace function public.get_my_threads()
returns table (
  thread_id uuid,
  other_user_id uuid,
  other_username text,
  last_message_body text,
  last_message_at timestamptz,
  last_message_sender_id uuid,
  is_unread boolean,
  muted boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  return query
  select
    t.id,
    case when t.user_a = me then t.user_b else t.user_a end,
    p.username,
    m.body,
    m.created_at,
    m.sender_id,
    (
      m.created_at is not null
      and m.sender_id <> me
      and m.created_at > coalesce(
        case when t.user_a = me then t.last_read_a else t.last_read_b end,
        '-infinity'::timestamptz
      )
    ),
    case when t.user_a = me then t.muted_by_a else t.muted_by_b end
  from public.chat_threads t
  join public.profiles p on p.id = (case when t.user_a = me then t.user_b else t.user_a end)
  left join lateral (
    select cm.body, cm.created_at, cm.sender_id
    from public.chat_messages cm
    where cm.thread_id = t.id
    order by cm.created_at desc
    limit 1
  ) m on true
  where (t.user_a = me or t.user_b = me)
    -- A block either way hides the thread (and the other person's name).
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = me and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = me)
    )
  order by coalesce(m.created_at, t.created_at) desc;
end;
$$;

create or replace function public.get_thread_peer(p_thread_id uuid)
returns table (id uuid, username text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  peer uuid;
begin
  select case when user_a = me then user_b else user_a end into peer
  from public.chat_threads
  where chat_threads.id = p_thread_id and (user_a = me or user_b = me);
  if peer is null then
    return;
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = me and b.blocked_id = peer)
       or (b.blocker_id = peer and b.blocked_id = me)
  ) then
    return;
  end if;
  return query select p.id, p.username from public.profiles p where p.id = peer;
end;
$$;

create or replace function public.join_train_together_party_by_code(p_invite_code text)
returns public.train_together_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.train_together_sessions;
  v_code text := upper(btrim(coalesce(p_invite_code, '')));
begin
  if auth.uid() is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Not authenticated';
  end if;
  if v_code !~ '^[A-Z0-9]{4,12}$' then
    raise exception 'Invalid or already-started invite code';
  end if;

  select * into v_session
  from public.train_together_sessions
  where upper(invite_code) = v_code
    and status = 'waiting'
  limit 1;

  if v_session.id is null then
    raise exception 'Invalid or already-started invite code';
  end if;

  insert into public.train_together_session_participants (session_id, user_id, invite_status)
  values (v_session.id, auth.uid(), 'accepted')
  on conflict (session_id, user_id) do update set invite_status = 'accepted';

  return v_session;
end;
$$;
