-- Train Together v2: parties of 2-4 real accounts, on the MAIN project
-- (wiowzwkowbilpjgbemsq), replacing the old standalone anonymous-auth
-- Train Together project. See docs/prompts/TRAIN_TOGETHER_REBUILD_PROMPT.md.
--
-- Applied directly to the live project (wiowzwkowbilpjgbemsq) via the
-- Supabase MCP tools on 2026-08-07; mirrored here to match. Table creation
-- order matters: the sessions table's RLS policies reference the
-- participants table, so participants (and its is_train_together_session_member
-- helper) must exist first — the sessions table itself is created early
-- (other tables reference it via foreign key) but its policies are added
-- last, after participants exists.

-- ─── Friendships ────────────────────────────────────────────────────────
-- Used to populate the roster picker in the party-formation flow.
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  constraint friendships_not_self check (requester_id <> addressee_id)
);

create unique index friendships_unique_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table public.friendships enable row level security;

create policy "friendships_select_participant"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "friendships_insert_as_requester"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

create policy "friendships_update_as_addressee"
  on public.friendships for update
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id);

-- ─── Sessions (table only — its policies are added below, after the
-- participants table they reference exists) ──────────────────────────────
-- One shared, single card position per session (`current_card_index`) —
-- every participant's device renders the exact same card off this row via
-- realtime, rather than each device tracking its own position. Whoever taps
-- "Next" attributes the just-finished card to a chosen participant (see the
-- train_together_advance_card() function below) and advances this shared
-- position for everyone at once.
create table public.train_together_sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users (id) on delete cascade,
  deck_category text not null check (deck_category in ('UpperBody', 'LowerBody', 'FullBody', 'Core')),
  card_count int not null check (card_count between 30 and 75),
  excluded_exercises text[] not null default '{}',
  card_sequence jsonb,
  current_card_index int not null default 0,
  card_started_at timestamptz,
  invite_code text not null,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index train_together_sessions_invite_code_idx
  on public.train_together_sessions (invite_code) where status = 'waiting';

alter table public.train_together_sessions enable row level security;

-- ─── Participants ───────────────────────────────────────────────────────
-- A row is both an invite and, once accepted, the live membership + running
-- stats record for that person in this session.
create table public.train_together_session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.train_together_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  invite_status text not null default 'pending' check (invite_status in ('pending', 'accepted', 'declined')),
  is_ready boolean not null default false,
  cards_completed int not null default 0,
  total_seconds numeric not null default 0,
  total_reps int not null default 0,
  total_hold_seconds numeric not null default 0,
  joined_at timestamptz not null default now(),
  unique (session_id, user_id)
);

alter table public.train_together_session_participants enable row level security;

-- security definer helper: RLS on this table can't reference itself in a
-- subquery for the "can I see my fellow participants' rows" check without
-- infinite recursion, so membership is resolved once here instead (same
-- pattern as nearby_profiles()/create_or_get_thread() elsewhere in this file
-- set — owned by a role with BYPASSRLS, so it reads both tables directly).
create or replace function public.is_train_together_session_member(p_session_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.train_together_sessions s
    where s.id = p_session_id and s.host_id = p_user_id
  ) or exists (
    select 1 from public.train_together_session_participants p
    where p.session_id = p_session_id and p.user_id = p_user_id
  );
$$;

revoke all on function public.is_train_together_session_member(uuid, uuid) from public;
grant execute on function public.is_train_together_session_member(uuid, uuid) to authenticated;

create policy "train_together_participants_select_member"
  on public.train_together_session_participants for select
  using (public.is_train_together_session_member(session_id, auth.uid()));

-- A participant row is created either by the host inviting someone (insert
-- with user_id = the invitee, invite_status = 'pending') or by someone
-- joining themselves via an invite code (insert with user_id = auth.uid()).
create policy "train_together_participants_insert"
  on public.train_together_session_participants for insert
  to authenticated
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.train_together_sessions s
      where s.id = session_id and s.host_id = auth.uid()
    )
  );

create policy "train_together_participants_update_own"
  on public.train_together_session_participants for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Sessions policies (now that participants exists) ────────────────────
create policy "train_together_sessions_select_participant"
  on public.train_together_sessions for select
  using (
    auth.uid() = host_id
    or exists (
      select 1 from public.train_together_session_participants p
      where p.session_id = id and p.user_id = auth.uid()
    )
  );

create policy "train_together_sessions_insert_as_host"
  on public.train_together_sessions for insert
  to authenticated
  with check (auth.uid() = host_id);

create policy "train_together_sessions_update_participant"
  on public.train_together_sessions for update
  using (
    auth.uid() = host_id
    or exists (
      select 1 from public.train_together_session_participants p
      where p.session_id = id and p.user_id = auth.uid()
    )
  );

-- ─── Atomic "who was this card for" attribution + advance ─────────────────
-- Called once per "Next" tap, from whichever device tapped it. Guards on
-- `p_expected_index` so a race between two people tapping Next at once only
-- lets the first one through (the loser's write is silently a no-op; their
-- client resyncs off the resulting realtime UPDATE instead of erroring).
create or replace function public.train_together_advance_card(
  p_session_id uuid,
  p_expected_index int,
  p_participant_user_id uuid,
  p_reps int,
  p_hold_seconds numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_started_at timestamptz;
  v_elapsed numeric;
  v_total int;
  v_next_index int;
begin
  if not public.is_train_together_session_member(p_session_id, auth.uid()) then
    raise exception 'Not a member of this session';
  end if;

  select card_started_at, jsonb_array_length(card_sequence)
    into v_started_at, v_total
    from public.train_together_sessions
    where id = p_session_id and current_card_index = p_expected_index
    for update;

  if not found then
    -- Someone else already advanced past this index — no-op, not an error.
    return;
  end if;

  v_elapsed := greatest(0, extract(epoch from (now() - coalesce(v_started_at, now()))));
  v_next_index := p_expected_index + 1;

  update public.train_together_session_participants
    set cards_completed = cards_completed + 1,
        total_seconds = total_seconds + v_elapsed,
        total_reps = total_reps + coalesce(p_reps, 0),
        total_hold_seconds = total_hold_seconds + coalesce(p_hold_seconds, 0)
    where session_id = p_session_id and user_id = p_participant_user_id;

  update public.train_together_sessions
    set current_card_index = v_next_index,
        card_started_at = now(),
        status = case when v_next_index >= v_total then 'completed' else status end,
        completed_at = case when v_next_index >= v_total then now() else completed_at end
    where id = p_session_id;
end;
$$;

revoke all on function public.train_together_advance_card(uuid, int, uuid, int, numeric) from public;
grant execute on function public.train_together_advance_card(uuid, int, uuid, int, numeric) to authenticated;

-- ─── Realtime ───────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.train_together_sessions;
alter publication supabase_realtime add table public.train_together_session_participants;
