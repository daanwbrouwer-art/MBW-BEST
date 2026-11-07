import { useWorkoutHistory } from "@/hooks/use-workout-history";
import { readSessions } from "@/lib/achievementSessionLog";
import { useWorkoutStore } from "@/store/workout";

export interface TrainingTotals {
  workouts: number;
  cards: number;
  calories: number;
  reps: number;
}

/** Deck category custom-deck sessions are logged under. */
export const CUSTOM_DECK_CATEGORY = "Custom";

/**
 * Lifetime totals for Home and Profile.
 * Accounts: the saved workout history, plus custom-deck workouts (those are
 * only kept on the phone). Guests have no saved history, so their totals
 * come from the workouts logged on this phone.
 */
export function useTrainingTotals(): TrainingTotals {
  const guestMode = useWorkoutStore((s) => s.guestMode);
  const { data: history } = useWorkoutHistory();
  const isGuest = guestMode && localStorage.getItem("mbw_user") === null;
  const sessions = readSessions(isGuest);
  const local = isGuest
    ? sessions
    : sessions.filter((s) => s.deckCategory === CUSTOM_DECK_CATEGORY);
  const totals: TrainingTotals = {
    workouts: local.length,
    cards: local.reduce((a, s) => a + s.cardsDrawn, 0),
    calories: local.reduce((a, s) => a + Math.round(s.caloriesBurned ?? 0), 0),
    reps: local.reduce((a, s) => a + s.totalReps, 0),
  };
  if (!isGuest && history) {
    totals.workouts += history.length;
    for (const h of history) {
      totals.cards += Number(h.cardsCompleted);
      totals.calories += Number(h.caloriesBurned);
      totals.reps += Number(h.totalReps);
    }
  }
  return totals;
}
