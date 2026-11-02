-- Security hardening from the 2026-10-31 review (MBW-full-review-2026-10-31.md).
-- Closes: chat preference bypass, profile self-tampering (gender / founder /
-- stats), nearby-users trilateration, Train Together hijacking, park/photo
-- moderation bypass, missing park-photos bucket, anon-callable SECURITY
-- DEFINER functions. Also rewrites policies with (select auth.uid()) and
-- indexes every foreign key (Supabase performance advisors).

-- ───────────────────────── anon: read-only map, nothing else ─────────────────
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from anon;
revoke all on public.waitlist_emails, public.blocked_keywords from anon, authenticated;

-- ───────────────────────── profiles ──────────────────────────────────────────
-- Only these columns are user-writable. Stats, achievements, streaks and
-- is_founding_member are server-only from now on.
revoke insert, update on public.profiles from authenticated;
grant insert (id, username, gender) on public.profiles to authenticated;
grant update (username, gender, discoverable, last_active_at, last_lat, last_lng,
              messaging_preference, preferred_equipment_tier,
              marketing_emails_opt_out, updated_at)
  on public.profiles to authenticated;

-- Gender is set once (onboarding). Silently keeping the old value — instead
-- of raising — means a re-run of onboarding never breaks, but changing it to
-- get past same-gender-only chat gating no longer works. Coordinates are
-- snapped to 2 decimals (~1 km) whatever the client sends.
create or replace function public.profiles_guard_writes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and old.gender is not null
     and new.gender is distinct from old.gender
     and current_user in ('authenticated', 'anon') then
    new.gender := old.gender;
  end if;
  if new.last_lat is not null then new.last_lat := round(new.last_lat::numeric, 2)::double precision; end if;
  if new.last_lng is not null then new.last_lng := round(new.last_lng::numeric, 2)::double precision; end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_writes on public.profiles;
create trigger profiles_guard_writes
  before insert or update on public.profiles
  for each row execute function public.profiles_guard_writes();

update public.profiles
  set last_lat = round(last_lat::numeric, 2)::double precision,
      last_lng = round(last_lng::numeric, 2)::double precision
  where last_lat is not null or last_lng is not null;

drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_self on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- ───────────────────────── nearby users: no trilateration ────────────────────
-- The search point is snapped to the same ~1 km grid and distances come back
-- rounded up to whole km, so repeated queries from chosen points can't
-- triangulate anyone below ~1 km.
create or replace function public.nearby_profiles(lat double precision, lng double precision, radius_km double precision)
returns table(id uuid, username text, gender text, last_active_at timestamptz, distance_km double precision)
language sql
stable security definer
set search_path = public
as $$
  with origin as (
    select geography(ST_SetSRID(ST_MakePoint(round(lng::numeric, 2)::double precision,
                                             round(lat::numeric, 2)::double precision), 4326)) as g
  )
  select
    p.id,
    p.username,
    p.gender,
    p.last_active_at,
    greatest(1, ceil(ST_Distance(geography(ST_SetSRID(ST_MakePoint(p.last_lng, p.last_lat), 4326)), o.g) / 1000.0))::double precision
  from public.profiles p, origin o
  where (select auth.uid()) is not null
    and p.discoverable = true
    and p.id <> (select auth.uid())
    and p.last_lat is not null
    and p.last_lng is not null
    and p.last_active_at > now() - interval '48 hours'
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = (select auth.uid()) and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = (select auth.uid()))
    )
    and ST_DWithin(geography(ST_SetSRID(ST_MakePoint(p.last_lng, p.last_lat), 4326)), o.g,
                   least(greatest(radius_km, 1), 100) * 1000.0)
  order by 5 asc, p.last_active_at desc
  limit 100;
$$;

-- ───────────────────────── chat ──────────────────────────────────────────────
-- Threads may only be created through create_or_get_thread, which enforces
-- blocks and the recipient's messaging preference.
drop policy if exists chat_threads_insert_participant on public.chat_threads;
revoke insert, update, delete on public.chat_threads from authenticated;
revoke update, delete on public.chat_messages from authenticated;

drop policy if exists chat_threads_select_participant on public.chat_threads;
create policy chat_threads_select_participant on public.chat_threads
  for select to authenticated using (
    ((select auth.uid()) = user_a or (select auth.uid()) = user_b)
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = chat_threads.user_a and b.blocked_id = chat_threads.user_b)
         or (b.blocker_id = chat_threads.user_b and b.blocked_id = chat_threads.user_a)
    )
  );

drop policy if exists chat_messages_select_participant on public.chat_messages;
drop policy if exists chat_messages_insert_participant on public.chat_messages;
create policy chat_messages_select_participant on public.chat_messages
  for select to authenticated using (
    exists (select 1 from public.chat_threads t
            where t.id = chat_messages.thread_id
              and ((select auth.uid()) = t.user_a or (select auth.uid()) = t.user_b))
  );
create policy chat_messages_insert_participant on public.chat_messages
  for insert to authenticated with check (
    sender_id = (select auth.uid())
    and exists (select 1 from public.chat_threads t
                where t.id = chat_messages.thread_id
                  and ((select auth.uid()) = t.user_a or (select auth.uid()) = t.user_b))
  );

-- ───────────────────────── blocks / reports / friendships / history ──────────
drop policy if exists blocks_select_own on public.blocks;
drop policy if exists blocks_insert_own on public.blocks;
drop policy if exists blocks_delete_own on public.blocks;
create policy blocks_select_own on public.blocks for select to authenticated using ((select auth.uid()) = blocker_id);
create policy blocks_insert_own on public.blocks for insert to authenticated with check ((select auth.uid()) = blocker_id);
create policy blocks_delete_own on public.blocks for delete to authenticated using ((select auth.uid()) = blocker_id);

drop policy if exists reports_select_own on public.reports;
drop policy if exists reports_insert_own on public.reports;
create policy reports_select_own on public.reports for select to authenticated using ((select auth.uid()) = reporter_id);
create policy reports_insert_own on public.reports for insert to authenticated with check ((select auth.uid()) = reporter_id);
revoke update, delete on public.reports from authenticated;

drop policy if exists friendships_select_participant on public.friendships;
drop policy if exists friendships_insert_as_requester on public.friendships;
drop policy if exists friendships_update_as_addressee on public.friendships;
create policy friendships_select_participant on public.friendships
  for select to authenticated using ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id);
create policy friendships_insert_as_requester on public.friendships
  for insert to authenticated with check ((select auth.uid()) = requester_id and status = 'pending');
create policy friendships_update_as_addressee on public.friendships
  for update to authenticated
  using ((select auth.uid()) = addressee_id) with check ((select auth.uid()) = addressee_id);
revoke update on public.friendships from authenticated;
grant update (status) on public.friendships to authenticated;

drop policy if exists workout_history_select_own on public.workout_history;
drop policy if exists workout_history_insert_own on public.workout_history;
create policy workout_history_select_own on public.workout_history for select to authenticated using ((select auth.uid()) = user_id);
create policy workout_history_insert_own on public.workout_history for insert to authenticated with check ((select auth.uid()) = user_id);
revoke update, delete on public.workout_history from authenticated;

-- ───────────────────────── parks: moderation can't be skipped ────────────────
drop policy if exists parks_insert_authenticated on public.parks;
create policy parks_insert_authenticated on public.parks
  for insert to authenticated with check (
    (select auth.uid()) = submitted_by and approved = false and source = 'user_submitted'
  );
-- Lets the submitter read back their own pending park (the app's
-- insert(...).select("id") failed without this, so submissions never saved).
drop policy if exists parks_select_own_pending on public.parks;
create policy parks_select_own_pending on public.parks
  for select to authenticated using ((select auth.uid()) = submitted_by);
revoke update, delete on public.parks from authenticated;

-- Photos get their own moderation flag and may only point at our bucket.
alter table public.park_photos add column if not exists approved boolean not null default false;
update public.park_photos set approved = true where approved = false;  -- pre-existing photos stay visible

drop policy if exists park_photos_select_if_park_approved on public.park_photos;
drop policy if exists park_photos_insert_authenticated on public.park_photos;
create policy park_photos_select_visible on public.park_photos
  for select using (
    (approved and exists (select 1 from public.parks p where p.id = park_photos.park_id and p.approved))
    or uploaded_by = (select auth.uid())
  );
create policy park_photos_insert_own on public.park_photos
  for insert to authenticated with check (
    uploaded_by = (select auth.uid())
    and approved = false
    and photo_url like 'https://wiowzwkowbilpjgbemsq.supabase.co/storage/v1/object/public/park-photos/%'
    and exists (select 1 from public.parks p
                where p.id = park_photos.park_id
                  and (p.approved or p.submitted_by = (select auth.uid())))
  );
revoke update, delete on public.park_photos from authenticated;

-- The bucket the app uploads to never existed in production.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('park-photos', 'park-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists park_photos_upload on storage.objects;
create policy park_photos_upload on storage.objects
  for insert to authenticated with check (
    bucket_id = 'park-photos'
    and exists (select 1 from public.parks p
                where p.id::text = (storage.foldername(name))[1]
                  and (p.approved or p.submitted_by = (select auth.uid())))
  );

-- ───────────────────────── Train Together ────────────────────────────────────
create or replace function public.is_train_together_session_member(p_session_id uuid, p_user_id uuid)
returns boolean
language sql
stable security definer
set search_path = public
as $$
  -- Only answers for the caller, so it can't be used to probe other people.
  select p_user_id = auth.uid() and (
    exists (select 1 from public.train_together_sessions s
            where s.id = p_session_id and s.host_id = p_user_id)
    or exists (select 1 from public.train_together_session_participants p
               where p.session_id = p_session_id and p.user_id = p_user_id)
  );
$$;

-- Exact (case-insensitive) match: the old ILIKE let "%" join any stranger's party.
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
  if auth.uid() is null then
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

-- Only the host edits the session row directly (setup + start); everyone
-- else goes through the SECURITY DEFINER card RPCs. The host can't hand the
-- row to someone else.
drop policy if exists train_together_sessions_update_participant on public.train_together_sessions;
drop policy if exists train_together_sessions_update_host on public.train_together_sessions;
create policy train_together_sessions_update_host on public.train_together_sessions
  for update to authenticated
  using ((select auth.uid()) = host_id) with check ((select auth.uid()) = host_id);

drop policy if exists train_together_sessions_insert_as_host on public.train_together_sessions;
create policy train_together_sessions_insert_as_host on public.train_together_sessions
  for insert to authenticated with check ((select auth.uid()) = host_id and status = 'waiting');

drop policy if exists train_together_sessions_select_participant on public.train_together_sessions;
create policy train_together_sessions_select_participant on public.train_together_sessions
  for select to authenticated using (
    (select auth.uid()) = host_id
    or exists (select 1 from public.train_together_session_participants p
               where p.session_id = train_together_sessions.id and p.user_id = (select auth.uid()))
  );
revoke delete on public.train_together_sessions from authenticated;

-- Participants: the host adds themself (accepted) or invites others
-- (pending). Joining a stranger's party by id is no longer possible —
-- codes go through join_train_together_party_by_code.
drop policy if exists train_together_participants_insert on public.train_together_session_participants;
create policy train_together_participants_insert on public.train_together_session_participants
  for insert to authenticated with check (
    exists (select 1 from public.train_together_sessions s
            where s.id = train_together_session_participants.session_id
              and s.host_id = (select auth.uid()))
    and (user_id = (select auth.uid()) or invite_status = 'pending')
  );

drop policy if exists train_together_participants_select_member on public.train_together_session_participants;
create policy train_together_participants_select_member on public.train_together_session_participants
  for select to authenticated using (public.is_train_together_session_member(session_id, (select auth.uid())));

drop policy if exists train_together_participants_update_own on public.train_together_session_participants;
create policy train_together_participants_update_own on public.train_together_session_participants
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Score columns are written only by train_together_advance_card.
revoke insert, update on public.train_together_session_participants from authenticated;
grant insert (session_id, user_id, invite_status, is_ready) on public.train_together_session_participants to authenticated;
grant update (invite_status, is_ready) on public.train_together_session_participants to authenticated;
revoke delete on public.train_together_session_participants from authenticated;

-- ───────────────────────── function execute rights ───────────────────────────
revoke execute on function public.create_or_get_thread(uuid) from public, anon;
revoke execute on function public.delete_my_account() from public, anon;
revoke execute on function public.get_my_threads() from public, anon;
revoke execute on function public.get_thread_peer(uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.profiles_guard_writes() from public, anon, authenticated;
revoke execute on function public.enforce_chat_message_limits() from public, anon, authenticated;
revoke execute on function public.is_train_together_session_member(uuid, uuid) from public, anon;
revoke execute on function public.join_train_together_party_by_code(text) from public, anon;
revoke execute on function public.mark_thread_read(uuid) from public, anon;
revoke execute on function public.nearby_profiles(double precision, double precision, double precision) from public, anon;
revoke execute on function public.set_thread_muted(uuid, boolean) from public, anon;
revoke execute on function public.train_together_advance_card(uuid, integer, integer, numeric) from public, anon;
revoke execute on function public.train_together_assign_card_owner(uuid, integer, uuid) from public, anon;

grant execute on function public.create_or_get_thread(uuid) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.get_my_threads() to authenticated;
grant execute on function public.get_thread_peer(uuid) to authenticated;
grant execute on function public.is_train_together_session_member(uuid, uuid) to authenticated;
grant execute on function public.join_train_together_party_by_code(text) to authenticated;
grant execute on function public.mark_thread_read(uuid) to authenticated;
grant execute on function public.nearby_profiles(double precision, double precision, double precision) to authenticated;
grant execute on function public.set_thread_muted(uuid, boolean) to authenticated;
grant execute on function public.train_together_advance_card(uuid, integer, integer, numeric) to authenticated;
grant execute on function public.train_together_assign_card_owner(uuid, integer, uuid) to authenticated;

-- ───────────────────────── foreign-key indexes ───────────────────────────────
create index if not exists blocks_blocked_id_idx on public.blocks (blocked_id);
create index if not exists chat_messages_sender_id_idx on public.chat_messages (sender_id);
create index if not exists chat_messages_thread_created_idx on public.chat_messages (thread_id, created_at desc);
create index if not exists chat_threads_user_a_idx on public.chat_threads (user_a);
create index if not exists chat_threads_user_b_idx on public.chat_threads (user_b);
create index if not exists friendships_addressee_id_idx on public.friendships (addressee_id);
create index if not exists friendships_requester_id_idx on public.friendships (requester_id);
create index if not exists park_photos_park_id_idx on public.park_photos (park_id);
create index if not exists park_photos_uploaded_by_idx on public.park_photos (uploaded_by);
create index if not exists parks_submitted_by_idx on public.parks (submitted_by);
create index if not exists reports_reported_id_idx on public.reports (reported_id);
create index if not exists reports_reporter_id_idx on public.reports (reporter_id);
create index if not exists tt_participants_user_id_idx on public.train_together_session_participants (user_id);
create index if not exists tt_sessions_card_owner_idx on public.train_together_sessions (current_card_owner_id);
create index if not exists tt_sessions_host_id_idx on public.train_together_sessions (host_id);

-- ───────────────────────── waitlist abuse limiting ───────────────────────────
-- Used by the join-waitlist edge function (service role only).
create table if not exists public.waitlist_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.waitlist_attempts enable row level security;
revoke all on public.waitlist_attempts from anon, authenticated;
create index if not exists waitlist_attempts_ip_created_idx on public.waitlist_attempts (ip_hash, created_at desc);
