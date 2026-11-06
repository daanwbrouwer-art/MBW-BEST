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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wanted text := nullif(btrim(coalesce(new.raw_user_meta_data->>'username', '')), '');
  v_name text;
  v_try int := 0;
begin
  v_name := coalesce(v_wanted, 'athlete_' || lpad((floor(random() * 1000000))::int::text, 6, '0'));
  loop
    begin
      insert into public.profiles (id, username) values (new.id, v_name)
      on conflict (id) do nothing;
      exit;
    exception when unique_violation then
      v_try := v_try + 1;
      if v_try > 5 then
        v_name := 'athlete_' || substr(replace(new.id::text, '-', ''), 1, 10);
      else
        v_name := coalesce(v_wanted, 'athlete') || '_' || lpad((floor(random() * 10000))::int::text, 4, '0');
      end if;
      if v_try > 6 then
        raise warning 'handle_new_user could not pick a username for %', new.id;
        exit;
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
  select not exists (
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
grant execute on function public.find_profile_by_username(text) to authenticated;

-- Usernames for a list of ids, filtered to people the caller is connected
-- to: a friendship in any state, a shared Train Together party, or a shared
-- chat thread. Anyone else is silently left out.
create or replace function public.get_usernames(p_ids uuid[])
returns table (id uuid, username text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username
  from public.profiles p
  where auth.uid() is not null
    and p.id = any (p_ids)
    and cardinality(p_ids) <= 200
    and (
      p.id = auth.uid()
      or exists (
        select 1 from public.friendships f
        where (f.requester_id = auth.uid() and f.addressee_id = p.id)
           or (f.addressee_id = auth.uid() and f.requester_id = p.id)
      )
      or exists (
        select 1
        from public.train_together_sessions s
        where (s.host_id = p.id or exists (
                select 1 from public.train_together_session_participants x
                where x.session_id = s.id and x.user_id = p.id))
          and (s.host_id = auth.uid() or exists (
                select 1 from public.train_together_session_participants y
                where y.session_id = s.id and y.user_id = auth.uid()))
      )
      or exists (
        select 1 from public.chat_threads t
        where (t.user_a = auth.uid() and t.user_b = p.id)
           or (t.user_b = auth.uid() and t.user_a = p.id)
      )
    );
$$;
revoke all on function public.get_usernames(uuid[]) from public;
grant execute on function public.get_usernames(uuid[]) to authenticated;

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

-- At most 100 saved decks per account.
create or replace function public.custom_decks_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.custom_decks where user_id = new.user_id) >= 100 then
    raise exception 'You can save up to 100 custom decks';
  end if;
  return new;
end;
$$;
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
