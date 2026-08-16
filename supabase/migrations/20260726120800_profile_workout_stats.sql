-- Beyond the base social/discovery schema requested for this step: the app's
-- existing UserProfile shape (src/backend.ts) needs lifetime workout stats to
-- come back from getMyProfile(). Rather than invent a parallel table, these
-- are added as columns on profiles — still governed entirely by the
-- "profiles_select_own" / "profiles_update_own" policies from
-- 20260726120100_profiles.sql, no new RLS needed.
alter table public.profiles
  add column created_at timestamptz not null default now(),
  add column total_workouts bigint not null default 0,
  add column total_reps bigint not null default 0,
  add column total_calories bigint not null default 0,
  add column last_workout_date timestamptz,
  add column reps_diamonds bigint not null default 0,
  add column reps_clubs bigint not null default 0,
  add column reps_spades bigint not null default 0,
  add column reps_hearts bigint not null default 0,
  add column ace_cards_drawn bigint not null default 0,
  add column king_cards_drawn bigint not null default 0,
  add column joker_cards_drawn bigint not null default 0,
  add column longest_streak bigint not null default 0,
  add column current_streak bigint not null default 0,
  add column full_decks_completed bigint not null default 0,
  add column unlocked_achievements jsonb not null default '[]'::jsonb;
