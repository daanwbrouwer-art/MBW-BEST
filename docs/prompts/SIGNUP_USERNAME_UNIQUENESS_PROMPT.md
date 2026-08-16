# Build prompt: reject duplicate usernames at signup

## Finding (confirmed by reading the code, not assumed)

This does **not** exist today. Checked both layers on the main Supabase project (`wiowzwkowbilpjgbemsq`):

- `supabase/migrations/20260726120100_profiles.sql` — `username text not null` has **no unique constraint or index**. Two accounts can currently have the identical username.
- `src/pages/onboarding/EmailSignUpPage.tsx` + `src/lib/remoteBackend.ts` (`registerUser`) — signup calls `supabase.auth.signUp({ email, password, options: { data: { username } } })` and never checks whether the username is taken, before or after. The `handle_new_user` trigger (`supabase/migrations/20260726120200_profiles_signup_trigger.sql`) just inserts whatever username it's given.

Note: the *separate* Train Together backend (`src/lib/trainTogetherBackend.ts`, `createTrainTogetherProfile`) already has this — it retries on a Postgres unique-violation (`23505`) and shows "That username's taken — try another." if the DB rejects it. That's the pattern to replicate here, on the main project.

## What to build

1. **Database:** add a case-insensitive unique constraint on `public.profiles.username` on the main project, e.g.:
   ```sql
   create unique index profiles_username_unique_idx on public.profiles (lower(username));
   ```
   Add this as a new migration file in `supabase/migrations/`, don't hand-edit the existing one.

2. **Trigger:** `handle_new_user` (in `20260726120200_profiles_signup_trigger.sql`) currently does a bare `insert`. A collision there will now raise `23505` and — same as the bug already fixed once before for this trigger (see the defensive rewrite from the prior session, if still in place) — an unhandled trigger error rolls back the whole `auth.users` insert, which surfaces to the user as a generic failure, not a helpful "username taken" message. Decide how signup should behave on collision and make it explicit rather than accidental:
   - Recommended: catch the username collision specifically in the trigger and re-raise a clear, distinguishable error (e.g. `RAISE EXCEPTION 'username_taken'`) rather than letting the raw `23505` bubble up — makes it easier for the client to detect this specific case vs. any other insert failure.

3. **Client-side UX** in `EmailSignUpPage.tsx`:
   - On submit, if `registerUser` fails because of the username collision specifically (detect via the distinguishable error from step 2, or by checking the raw Postgres error code/message if that's simpler), set the inline error to something like `"That username is already taken — try another."` instead of the current generic `"Registration failed. Please try again."`.
   - Optional but recommended for a better signup experience: debounce a live availability check as the user types the username (query `profiles` for `lower(username) = lower($input)`), showing an inline "✓ available" / "✗ taken" state before they even submit — same idea as the Train Together hub's username step, but live rather than only checked on submit.

## Acceptance checklist

- [ ] Two accounts cannot end up with the same username (case-insensitive) — enforced at the database level, not just in the UI.
- [ ] Signing up with a taken username shows a specific, friendly inline error, not a generic failure message.
- [ ] Signup for a non-colliding username still works end-to-end (don't regress the existing flow while adding this).
