-- Train Together: lets the host pick one of their saved Custom Workout
-- Builder decks (src/store/customWorkout.ts's `decks`) instead of a
-- built-in deck_category. A custom deck is an arbitrary named exercise
-- list with no category/rank shape, and a participant's device has no
-- local copy of the host's saved deck, so the full exercise list has to
-- travel through this row to reach everyone — same as card_sequence
-- already does for the built-in path.
--
-- Applied directly to the live project (wiowzwkowbilpjgbemsq) via the
-- Supabase MCP tools on 2026-08-18; mirrored here to match, same
-- convention as 20260807130000_waitlist_emails.sql.
--
-- Nullable and purely additive: existing deck_category/card_count/
-- excluded_exercises columns and their constraints are untouched, so
-- every pre-built-deck session keeps behaving exactly as before.
-- custom_deck is only ever read/written when it's non-null; when it is,
-- deck_category/card_count/excluded_exercises are simply ignored
-- app-side (still populated with whatever placeholder value the session
-- was created with, to satisfy their existing NOT NULL/check constraints,
-- which are intentionally left as-is).
alter table public.train_together_sessions
  add column custom_deck jsonb;

-- No RLS policy change: "train_together_sessions_select_participant"
-- (see 20260807120000_train_together_v2.sql) is a row-level policy with
-- no column-level GRANT restricting it further, so it already covers
-- every column on the table -- including this new one -- for anyone it
-- lets read the row at all (the host, or an accepted/pending
-- participant). card_sequence already relies on this same fact today.
