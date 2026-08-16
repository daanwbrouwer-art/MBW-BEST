# Train Together v2 (party of 2–4, one shared synced session, per-card attribution, competitive summary)

## Status: implemented 2026-08-07

This spec has been built — see `src/pages/TrainTogetherHubPage.tsx`, `TrainTogetherWaitingRoomPage.tsx`, `TrainTogetherSessionPage.tsx`, `src/lib/trainTogetherBackend.ts`, `trainTogetherDraw.ts`, `trainTogetherTypes.ts`, and the migration `supabase/migrations/20260807120000_train_together_v2.sql`. `npm run typecheck`, `biome check`, and `npm run build` all pass against it. Kept here as the accurate reference for what shipped and why, and as a build prompt if any of this needs redoing.

**Not yet done: the migration has not been applied to the live Supabase project (`wiowzwkowbilpjgbemsq`).** It's a local draft only — apply it deliberately (confirm current live schema first; this repo's migration history has drifted from live reality before, see the note at the top of `20260727180000_nearby_users_blocks_and_threads_foundation.sql`), then regenerate `src/lib/database.types.ts` via the Supabase MCP tools and delete `src/lib/trainTogetherTypes.ts` in favor of the generated `Tables<"train_together_sessions">` etc.

## Context

This is the MyBodyWeight (MBW) app — Vite + React 19 + TypeScript + TanStack Router/Query + Capacitor + Supabase. There were **two Supabase projects**:

- `wiowzwkowbilpjgbemsq` ("Daan's project") — **the live app**. Real accounts (`supabase.auth`), `profiles`, `workout_history`, Nearby/Chat. `.env` → `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- `mztpzzrmehurfecyapwj` — a second, separate Supabase project the *old* Train Together v1 used exclusively, with **anonymous auth**, completely decoupled from real accounts.

**Train Together now lives entirely on the main project.** The old anonymous-auth client (`src/lib/trainTogetherClient.ts`) and its generated types (`src/lib/trainTogetherDatabase.types.ts`) have been deleted, along with the `VITE_TRAIN_TOGETHER_SUPABASE_*` env vars. This was required because the feature now (a) requires a real signed-in account + active subscription to enter, and (b) persists each session's results against the user's real profile. An anonymous-only backend couldn't do either.

## Terminology decision: one shared session, not two modes

An earlier draft of this spec proposed a host-picks-"Share screen? Yes/No" fork between two different session mechanics. That was replaced with a simpler, single design after clarifying intent: **no OS-level screen mirroring, ever** — every participant's device just renders the identical UI, live-synced off one shared card position on the session row (`train_together_sessions.current_card_index`), via Supabase Realtime. This covers both "everyone's phones, possibly in different countries" and "one phone passed around a room" the same way, with no mode switch to build or explain.

**Attribution is universal, not conditional on a mode:** every tap of "Next" — from whichever device taps it — opens a "Whose rep was this?" sheet listing the party's names, before advancing. See `train_together_advance_card()` in the migration and `attributeCardAndAdvance()` in `trainTogetherBackend.ts` — it's one atomic RPC call that (1) credits the picked participant's running stats and (2) advances the shared card index, guarded by an `expectedIndex` check so two people tapping Next at once only lets the first through; the loser's client just resyncs off the resulting realtime `UPDATE` rather than erroring.

## 1. Party formation flow

**Hub screen header:** Title `Train Together`, subtitle `Choose 2, 3, or 4 — including you` (`TrainTogetherHubPage.tsx`).

1. **Gate.** Entering the hub requires a real account (`localStorage.getItem("mbw_user") !== null` and not `guestMode`) and an active subscription (`useTier().effectiveTier === "subscriber"`, the same check `CustomWorkoutBuilderPage.tsx` already uses, reusing the existing `PaywallModal`). Locked state explains which of the two is missing and routes to sign-up or the paywall accordingly.
2. **Party size.** Chips `2` / `3` / `4`, inside the "Start a party" bottom sheet.
3. **Roster.** Own username pinned at the top (fetched from `profiles`, not re-entered — a real account already has one). `size − 1` open slots, each opened via a picker: search by username (`findProfileByUsername`) or pick from accepted friendships (`listFriendships`, ported from v1's `friendships` table onto the main project).
4. **Send invites.** Creates the party (`createTrainTogetherParty`, host auto-joins accepted) then invites each filled slot (`inviteToParty`, inserts a `pending` participant row) and navigates to the waiting room. A party can also be joined directly by invite code (`joinPartyByCode` / `getSessionByInviteCode`), bypassing the friend-invite step.
5. Invitees see pending invites on their own hub (`listPendingPartyInvites`) and accept/decline (`respondToPartyInvite`) straight into the waiting room.

## 2. Workout setup (host-only, in the waiting room)

`TrainTogetherWaitingRoomPage.tsx` → `WorkoutSetupSheet`, editable any time before start:

1. **Deck category:** Lower Body / Upper Body / Full Body / Core. Core is shown but disabled ("Coming soon") since `exerciseCatalog.ts` has zero Core exercises — re-check that before ever enabling it.
2. **Card count:** chips `30` (minimum) and `52` (standard), plus `Custom` revealing a slider clamped to `30–75`. This is the *total* cards the party experiences, not per-person — `drawTrainTogetherSteps` doesn't scale it by party size.
3. **Exclude exercises:** checklist of the chosen category's pool, all included by default; unchecking removes an exercise from the draw. `availablePoolSize()` warns inline when exclusions leave fewer exercises than the requested card count (the draw still works — it reshuffles and repeats — but the host should know).
4. **Start** (`startTrainTogetherSession`, host-only): draws the one shared `card_sequence` once and flips the session to `active`.

## 3. Live session (`TrainTogetherSessionPage.tsx`)

- Every device subscribes to the session row (`subscribeToSession`) and renders `card_sequence[current_card_index]` — the same card, everywhere, always.
- A live per-participant progress strip (`LiveStatsStrip`) shows each accepted participant's `cardsCompleted` against the total.
- Tapping **Next** opens `AttributionPicker` (party roster, last pick pre-highlighted but never auto-confirmed) → `attributeCardAndAdvance()`. Isometric holds attribute at the moment Next is pressed after the hold completes, same as before.
- When the RPC's index reaches the total, it flips `status` to `completed` server-side; every subscribed device sees that and swaps to `SessionSummary`.

## 4. Stats model

Per participant, accumulated server-side inside the same atomic RPC on every card (`train_together_session_participants` columns):

- `cards_completed` — count of cards attributed to them.
- `total_seconds` — sum of wall-clock time between a card appearing (`card_started_at`) and Next being pressed for it, for every card attributed to them.
- `total_reps` — sum of `value` for every non-isometric card attributed to them.
- `total_hold_seconds` — sum of `value` for every isometric card attributed to them.

One running accumulator per person, not a separate timer widget — this is what "don't make it separate, make it into one session" meant in the original ask.

## 5. End-of-session summary

`SessionSummary` in `TrainTogetherSessionPage.tsx`: header is total session duration + card count (one session, not per-card entries), then a leaderboard ranked by `cardsCompleted`, each row showing cards/total, `mm:ss` time, reps, and hold-seconds.

## 6. Persistence

New tables on the main project, both RLS-scoped to session participants (see the migration for the full policy set and the `is_train_together_session_member()` helper that avoids RLS self-recursion on the participants table):

- `train_together_sessions` — host, deck, card count, exclusions, shared card sequence + position, invite code, status.
- `train_together_session_participants` — invite status, ready flag, and the four running stat columns above.

**Not done, and deliberately so:** Train Together results are not written into the existing `workout_history` table. That table's schema is playing-card-deck-specific (ace/king/joker counts, reps-by-suit) and doesn't map onto Train Together's exercise-based model — force-fitting zeroed/nonsense values into those columns would be worse than leaving it a separate surface. If a unified profile stats view is wanted later, it should read from both tables rather than merging the schemas.

## 7. Access gating

Implemented via the existing `useTier()` hook and `PaywallModal` component (already used by `CustomWorkoutBuilderPage.tsx` for the same purpose) rather than a new stub — there was already a real entitlement system (`src/hooks/use-tier.ts`, `src/lib/payments.ts`, RevenueCat) that an earlier pass of this doc had missed. `isRealAccount = isEmailAuth && !guestMode`; `isSubscriber = effectiveTier === "subscriber"`; both are required to unlock the hub.

## Acceptance checklist

- [x] Party of 2, 3, or 4 (including host) assembled from friends + invite codes; host pinned at top.
- [x] One shared, live-synced session UI for every device — no screen-mirroring, no per-device mode fork.
- [x] Deck category → card count (30 / 52 / custom up to 75) → exclude exercises, host-only, editable pre-start.
- [x] "Whose rep was this?" attribution on every Next tap, listing the party's names.
- [x] Per-participant running stats: cards completed, total seconds, total reps, total hold-seconds.
- [x] End-of-session leaderboard, framed as one session.
- [x] Session + per-participant results persisted on the main Supabase project, tied to real `auth.users`.
- [x] Train Together requires a real account (not guest) and an active subscription to enter.
- [x] Old anonymous-auth Train Together project's client/types deleted, not left running in parallel.
- [ ] Migration applied to the live project + `database.types.ts` regenerated (see Status note above — not done yet, needs a deliberate apply step).
