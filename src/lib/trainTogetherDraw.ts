import { EXERCISE_CATALOG } from "@/data/exerciseCatalog";
// Card-draw algorithm for Train Together v2 sessions. Draws from the same
// exercise pool the Custom Workout Builder uses (src/data/exerciseCatalog.ts)
// and reuses buildCustomWorkoutSteps() for the Double/Half modifier-card
// mechanic, same as before — the difference from v1 is that the total card
// count (30-75, chosen by the host) and the excluded-exercise set are both
// caller-supplied instead of fixed per difficulty.
import {
  type CustomWorkoutStep,
  buildCustomWorkoutSteps,
} from "@/lib/customWorkoutBuilder";
import type { CustomWorkoutExercise } from "@/store/customWorkout";

/** Core is currently locked (no cards yet, see exerciseCatalog.ts) but kept in the type so the UI can show it as a disabled "coming soon" choice rather than silently omitting it. */
export type TrainTogetherCategory =
  | "UpperBody"
  | "LowerBody"
  | "FullBody"
  | "Core";

export const MIN_CARD_COUNT = 30;
export const STANDARD_CARD_COUNT = 52;
export const MAX_CARD_COUNT = 75;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function poolForCategory(category: TrainTogetherCategory) {
  if (category === "FullBody") return EXERCISE_CATALOG;
  return EXERCISE_CATALOG.filter((ex) => ex.categories.includes(category));
}

/** How many distinct exercises are available for this category once exclusions are applied — used by the setup UI to warn before a count that can't be filled without heavy repetition. */
export function availablePoolSize(
  category: TrainTogetherCategory,
  excludedNames: ReadonlySet<string>,
): number {
  return poolForCategory(category).filter((ex) => !excludedNames.has(ex.name))
    .length;
}

/**
 * Draws a shuffled sequence of steps (exercises + modifier cards) totalling
 * exactly `cardCount` steps — "cardCount" is the number of cards the party
 * actually experiences, matching how the host picks it (30 min / 52
 * standard / up to 75 custom), not the pre-modifier exercise count.
 *
 * If the available pool (after exclusions) is smaller than needed, it
 * reshuffles and repeats rather than failing — callers should steer hosts
 * away from that via `availablePoolSize` before it comes to this, but a
 * short repeat is a better failure mode than an incomplete deck.
 */
export function drawTrainTogetherSteps(
  category: TrainTogetherCategory,
  cardCount: number,
  excludedNames: ReadonlySet<string> = new Set(),
): CustomWorkoutStep[] {
  const pool = poolForCategory(category).filter(
    (ex) => !excludedNames.has(ex.name),
  );
  if (pool.length === 0) return [];

  const picks: (typeof pool)[number][] = [];
  let shuffled = shuffle(pool);
  let steps: CustomWorkoutStep[] = [];

  // Draw base exercises in small batches, rebuilding the step sequence (base
  // + interleaved modifier cards) each time, until it reaches cardCount —
  // modifier cards mean the step count grows faster than the pick count, so
  // this converges in a couple of iterations rather than needing exact math.
  while (steps.length < cardCount) {
    if (shuffled.length === 0) shuffled = shuffle(pool);
    picks.push(shuffled.shift() as (typeof pool)[number]);
    const exercises: CustomWorkoutExercise[] = picks.map((ex) => ({
      name: ex.name,
      isIsometric: ex.isIsometric,
      value: ex.isIsometric
        ? (ex.defaultHoldSeconds ?? 20)
        : (ex.defaultReps ?? 10),
      eachSide: ex.eachSide,
    }));
    steps = buildCustomWorkoutSteps(exercises);
  }

  return steps.slice(0, cardCount);
}

export type { CustomWorkoutStep };
