-- Two changes, shipped together because the second is dead on arrival
-- without the first:
--
-- (1) Fixes a pre-existing bug in train_together_sessions_select_participant
-- / _update_participant (from 20260807120000_train_together_v2.sql): the
-- subquery's `where p.session_id = id` left `id` unqualified, and since
-- train_together_session_participants ALSO has an `id` column (its own
-- primary key), Postgres resolved it to `p.id` instead of the intended
-- outer `train_together_sessions.id` -- so `p.session_id = p.id` was
-- essentially never true. In practice this meant no participant other
-- than the host could ever read or update a session row. Confirmed live:
-- inserted a real second participant, valid JWT, `is_participant = true`
-- by the intended logic, and the RLS-filtered REST call still returned
-- zero rows.
--
-- (2) Card attribution moves from "ask who just did this, after" to "ask
-- who's about to do this, before" -- adds current_card_owner_id (null =
-- unclaimed) and a new train_together_assign_card_owner() RPC to claim
-- the current card for a participant, race-guarded the same way advance
-- already is. train_together_advance_card() now reads the owner off the
-- row instead of taking it as a parameter (by the time anyone taps
-- Next, who it's for was already decided and broadcast to the whole
-- party), and clears the assignment on advance so the next card starts
-- unclaimed again.
--
-- Applied directly to the live project (wiowzwkowbilpjgbemsq) via the
-- Supabase MCP tools on 2026-08-18; mirrored here to match.

-- ─── (1) RLS fix ────────────────────────────────────────────────────────
alter policy "train_together_sessions_select_participant"
  on public.train_together_sessions
  using (
    auth.uid() = host_id
    or exists (
      select 1 from public.train_together_session_participants p
      where p.session_id = train_together_sessions.id and p.user_id = auth.uid()
    )
  );

alter policy "train_together_sessions_update_participant"
  on public.train_together_sessions
  using (
    auth.uid() = host_id
    or exists (
      select 1 from public.train_together_session_participants p
      where p.session_id = train_together_sessions.id and p.user_id = auth.uid()
    )
  );

-- ─── (2) Card ownership ─────────────────────────────────────────────────
alter table public.train_together_sessions
  add column current_card_owner_id uuid references auth.users(id) on delete set null;

create or replace function public.train_together_assign_card_owner(
  p_session_id uuid,
  p_expected_index int,
  p_owner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_train_together_session_member(p_session_id, auth.uid()) then
    raise exception 'Not a member of this session';
  end if;
  if not exists (
    select 1 from public.train_together_session_participants
    where session_id = p_session_id and user_id = p_owner_user_id and invite_status = 'accepted'
  ) then
    raise exception 'Not an accepted participant of this session';
  end if;

  update public.train_together_sessions
    set current_card_owner_id = p_owner_user_id
    where id = p_session_id
      and current_card_index = p_expected_index
      and current_card_owner_id is null;
end;
$$;

revoke all on function public.train_together_assign_card_owner(uuid, int, uuid) from public;
grant execute on function public.train_together_assign_card_owner(uuid, int, uuid) to authenticated;

drop function if exists public.train_together_advance_card(uuid, int, uuid, int, numeric);

create or replace function public.train_together_advance_card(
  p_session_id uuid,
  p_expected_index int,
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
  v_owner_id uuid;
  v_elapsed numeric;
  v_total int;
  v_next_index int;
begin
  if not public.is_train_together_session_member(p_session_id, auth.uid()) then
    raise exception 'Not a member of this session';
  end if;

  select card_started_at, current_card_owner_id, jsonb_array_length(card_sequence)
    into v_started_at, v_owner_id, v_total
    from public.train_together_sessions
    where id = p_session_id and current_card_index = p_expected_index
    for update;

  if not found then
    -- Someone else already advanced past this index — no-op, not an error.
    return;
  end if;

  if v_owner_id is null then
    raise exception 'No one has claimed this card yet';
  end if;

  v_elapsed := greatest(0, extract(epoch from (now() - coalesce(v_started_at, now()))));
  v_next_index := p_expected_index + 1;

  update public.train_together_session_participants
    set cards_completed = cards_completed + 1,
        total_seconds = total_seconds + v_elapsed,
        total_reps = total_reps + coalesce(p_reps, 0),
        total_hold_seconds = total_hold_seconds + coalesce(p_hold_seconds, 0)
    where session_id = p_session_id and user_id = v_owner_id;

  update public.train_together_sessions
    set current_card_index = v_next_index,
        current_card_owner_id = null,
        card_started_at = now(),
        status = case when v_next_index >= v_total then 'completed' else status end,
        completed_at = case when v_next_index >= v_total then now() else completed_at end
    where id = p_session_id;
end;
$$;

revoke all on function public.train_together_advance_card(uuid, int, int, numeric) from public;
grant execute on function public.train_together_advance_card(uuid, int, int, numeric) to authenticated;
