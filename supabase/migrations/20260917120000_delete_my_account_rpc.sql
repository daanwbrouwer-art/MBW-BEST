-- Google Play's account-deletion policy (and basic right-to-erasure
-- practice) requires an in-app way to delete an account and its data —
-- this app had no such path at all before this migration, only sign-out.
--
-- No table in this schema has a real foreign key back to auth.users (or,
-- with one exception, to profiles) — see the delete_rule audit run
-- 2026-09-12, which found only chat_messages -> chat_threads,
-- park_photos -> parks, and train_together_session_participants ->
-- train_together_sessions as CASCADE. So this function does the cleanup
-- manually, in an order that leans on those three CASCADEs where they
-- apply, before finally removing the auth.users row itself (which a
-- plain client call can't do — that needs the service-role key — hence
-- SECURITY DEFINER here instead).
--
-- Community content (parks, park_photos) is anonymized, not deleted:
-- other users' saved locations shouldn't disappear because the
-- submitter deleted their account. A train_together_session this user
-- doesn't own but is the current live card owner of is similarly
-- detached (current_card_owner_id set to null) rather than deleted,
-- since that's someone else's in-progress session.
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

  -- Threads this user is part of — chat_messages cascades automatically.
  delete from chat_threads where user_a = v_uid or user_b = v_uid;

  -- Sessions this user hosts — participants cascade automatically.
  delete from train_together_sessions where host_id = v_uid;
  -- This user's own participation in sessions someone else hosts.
  delete from train_together_session_participants where user_id = v_uid;
  -- Detach (don't delete) another host's session if this user merely
  -- held the current card when they deleted their account.
  update train_together_sessions
    set current_card_owner_id = null
    where current_card_owner_id = v_uid;

  delete from blocks where blocker_id = v_uid or blocked_id = v_uid;
  delete from reports where reporter_id = v_uid or reported_id = v_uid;
  delete from friendships where requester_id = v_uid or addressee_id = v_uid;
  delete from workout_history where user_id = v_uid;

  -- Anonymize rather than delete: community content other users rely on.
  update park_photos set uploaded_by = null where uploaded_by = v_uid;
  update parks set submitted_by = null where submitted_by = v_uid;

  delete from profiles where id = v_uid;

  -- Removes the login itself — cascades to that user's own
  -- auth.sessions/refresh_tokens/identities via Supabase's own internal
  -- FKs, ending their current session too.
  delete from auth.users where id = v_uid;
end;
$$;

grant execute on function public.delete_my_account() to authenticated;
