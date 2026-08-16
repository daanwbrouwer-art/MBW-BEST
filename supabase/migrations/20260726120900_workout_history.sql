-- Beyond the base schema requested for this step: mirrors
-- WorkoutHistoryEntry (src/backend.ts) so saveWorkoutHistory/
-- getMyWorkoutHistory in remoteBackend.ts have somewhere to persist to.
create table public.workout_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  completed_at timestamptz not null,
  deck_id text not null,
  total_reps bigint not null,
  duration_seconds bigint not null,
  cards_completed bigint not null,
  calories_burned bigint not null,
  ace_cards_drawn bigint not null default 0,
  king_cards_drawn bigint not null default 0,
  joker_cards_drawn bigint not null default 0,
  reps_diamonds bigint not null default 0,
  reps_clubs bigint not null default 0,
  reps_spades bigint not null default 0,
  reps_hearts bigint not null default 0,
  is_valid boolean not null default true,
  avg_time_per_card double precision not null default 0,
  -- Per-exercise rep breakdown for this session (WorkoutHistoryEntry.repsByExercise,
  -- src/backend.ts) — an [name, reps] pair per exercise. Added here rather than
  -- left off as originally drafted: WorkoutSummaryPage.tsx already computes and
  -- sends this on every save, so leaving no column for it would silently
  -- discard real per-exercise data on every write.
  reps_by_exercise jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index workout_history_user_id_idx on public.workout_history (user_id, completed_at desc);

alter table public.workout_history enable row level security;

create policy "workout_history_select_own"
  on public.workout_history for select
  using (auth.uid() = user_id);

create policy "workout_history_insert_own"
  on public.workout_history for insert
  to authenticated
  with check (auth.uid() = user_id);
