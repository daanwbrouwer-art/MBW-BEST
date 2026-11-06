-- Fixes "infinite recursion detected in policy for relation
-- train_together_session_participants" when creating a party.
--
-- 20261102120000_security_hardening made the participants INSERT check read
-- train_together_sessions (only the host may add rows). The sessions SELECT
-- policy read train_together_session_participants directly, so Postgres saw
-- participants -> sessions -> participants and refused the insert.
--
-- The participant half now goes through is_train_together_session_member(),
-- a SECURITY DEFINER function owned by postgres (BYPASSRLS), so it no longer
-- triggers the participants policies. The host check stays inline: the
-- function is STABLE and can't see a row inserted by the same statement, so
-- without it `insert ... returning` (what createParty does) fails RLS.
--
-- Applied to the live project (wiowzwkowbilpjgbemsq) on 2026-11-06 as
-- fix_train_together_policy_recursion + fix_train_together_sessions_select_host_inline.
drop policy if exists train_together_sessions_select_participant on public.train_together_sessions;
create policy train_together_sessions_select_participant on public.train_together_sessions
  for select to authenticated
  using ((select auth.uid()) = host_id
         or public.is_train_together_session_member(id, (select auth.uid())));
