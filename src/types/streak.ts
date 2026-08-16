export interface StreakExerciseEntry {
  name: string;
  reps: number;
}

export interface StreakDayEntry {
  /** YYYY-MM-DD, local timezone. */
  date: string;
  cardsDrawn: number;
  deckUsed: string;
  exercises: StreakExerciseEntry[];
}

export interface BestExercise {
  name: string;
  reps: number;
  /** YYYY-MM-DD, local timezone. */
  dateAchieved: string;
}

export interface StreakData {
  /** 1-7 qualifying training days per week to keep the streak alive. */
  weeklyGoal: number;
  /** Qualifying days trained so far in the current Mon-Sun week — recomputed on every sync. */
  currentWeekTrainingDays: number;
  /** Consecutive weeks the weekly goal was met. */
  current: number;
  /** All-time longest streak, in weeks. */
  longest: number;
  /** YYYY-MM-DD of the last completed training day, or null. */
  lastTrainingDate: string | null;
  totalTrainingDaysThisYear: number;
  /** Calendar year the count above applies to — resets on Jan 1st. */
  totalTrainingDaysYear: number;
  bestExercise: BestExercise | null;
  history: StreakDayEntry[];
  /**
   * Internal bookkeeping: YYYY-MM-DD (Monday) of the most recent week whose
   * pass/fail outcome has already been folded into `current`/`longest`.
   * Prevents double-counting a week that was banked early (mid-week, the
   * moment the goal was hit) when a later catch-up sync walks forward.
   */
  lastProcessedWeekStart: string | null;
}
