-- Fixes a chicken-and-egg RLS deadlock in Train Together's "join by invite
-- code" flow, found via live testing on 2026-09-12: a non-participant can't
-- SELECT a train_together_sessions row (that policy only allows the host or
-- an existing participant), and an INSERT into
-- train_together_session_participants referencing that session_id fails its
-- foreign-key visibility check for the same reason — so an outsider can
-- never see, and therefore never join, a party by code. Every other join
-- path (host inviting a friend directly) was unaffected, since the host
-- already has SELECT on their own session.
--
-- Fix: a SECURITY DEFINER RPC that looks up the session by code and inserts
-- the caller as a participant in one step, bypassing RLS deliberately (the
-- invite code itself is the authorization — same pattern already used by
-- create_or_get_thread / nearby_profiles elsewhere in this schema).

create or replace function public.join_train_together_party_by_code(
  p_invite_code text
)
returns train_together_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session train_together_sessions;
begin
  select * into v_session
  from train_together_sessions
  where invite_code ilike p_invite_code
    and status = 'waiting'
  limit 1;

  if v_session.id is null then
    raise exception 'Invalid or already-started invite code';
  end if;

  insert into train_together_session_participants (session_id, user_id, invite_status)
  values (v_session.id, auth.uid(), 'accepted')
  on conflict (session_id, user_id) do nothing;

  return v_session;
end;
$$;

grant execute on function public.join_train_together_party_by_code(text) to authenticated;
