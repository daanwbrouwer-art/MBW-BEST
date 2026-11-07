// A finished custom-deck workout counts like any other workout: it adds a
// training day to the streak, its reps to Exercise Progress, and a session
// to the on-phone workout log (Home/Profile totals, monthly/yearly recaps).
import { CUSTOM_DECK_CATEGORY } from "@/hooks/use-training-totals";
import { getMovementCategory } from "@/hooks/use-workout";
import { buildSessionRecord, recordSession } from "@/lib/achievementSessionLog";
import { estimateCardCalories } from "@/lib/calories";
import type { CustomWorkoutStep } from "@/lib/customWorkoutBuilder";
import { recordCompletedWorkout } from "@/lib/streak";
import { useWorkoutStore } from "@/store/workout";

export function recordCustomWorkout(params: {
  deckName: string;
  steps: CustomWorkoutStep[];
  startedAt: number;
  gender: "male" | "female";
  body: { weightKg?: number; age?: number; heightCm?: number };
}): void {
  const { deckName, steps, startedAt, gender, body } = params;
  if (steps.length === 0) return;
  // Same rule as the workout summary page.
  const isGuest =
    useWorkoutStore.getState().guestMode &&
    localStorage.getItem("mbw_user") === null;
  const now = Date.now();

  const repsByExercise = new Map<string, number>();
  let calories = 0;
  for (const s of steps) {
    calories += estimateCardCalories({
      movementCategory: getMovementCategory(s.name),
      reps: s.isIsometric ? undefined : s.value,
      holdSeconds: s.isIsometric ? s.value : undefined,
      eachSide: s.eachSide,
      exerciseName: s.name,
      ...body,
    });
    if (!s.isIsometric) {
      repsByExercise.set(s.name, (repsByExercise.get(s.name) ?? 0) + s.value);
    }
  }

  recordCompletedWorkout(isGuest, {
    cardsDrawn: steps.length,
    deckUsed: deckName,
    exercises: [...repsByExercise].map(([name, reps]) => ({ name, reps })),
  });
  recordSession(
    isGuest,
    buildSessionRecord({
      id: `custom-${now}`,
      completedAt: now,
      durationSeconds: Math.max(0, Math.round((now - startedAt) / 1000)),
      totalCardsInSession: steps.length,
      deckCategory: CUSTOM_DECK_CATEGORY,
      deckDifficulty: CUSTOM_DECK_CATEGORY,
      deckGender: gender,
      playedCards: steps.map((s) => ({
        rank: s.modifier ?? "Custom",
        suit: "Custom",
        exercise: s.name,
        reps: s.isIsometric ? 0 : s.value,
      })),
      equipmentSnapshot: {
        weightVest: false,
        resistanceBandLong: false,
        resistanceBandShort: false,
        rings: false,
      },
      caloriesBurned: Math.round(calories),
    }),
  );
}
