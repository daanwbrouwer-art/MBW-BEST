-- Applied directly to the live project via the Supabase MCP tools; mirrored
-- here for documentation.
--
-- Supabase's default privileges grant EXECUTE to anon/authenticated
-- directly on function creation, not just via the PUBLIC pseudo-role — the
-- earlier "revoke ... from public" (in 20260727190000_gender_gated_chat.sql)
-- didn't touch those direct grants, which is why the security advisor still
-- flagged this trigger-only function as callable via
-- /rest/v1/rpc/enforce_chat_message_limits after that migration.
revoke all on function public.enforce_chat_message_limits() from anon, authenticated;
