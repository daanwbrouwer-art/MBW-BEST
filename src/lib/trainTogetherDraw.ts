import { EXERCISE_CATALOG } from "@/data/exerciseCatalog";
// Card-draw algorithm for Train Together v2 sessions. Draws from the same
// exercise pool the Custom Workout Builder uses (src/data/exerciseCatalog.ts)
// and reuses buildCustomWorkoutSteps() for the Double/Half modifier-card
// mechanic, same as before — the difference from v1 is that the total card
// count (30-75, chosen by the host) and the excluded-exercise set are both
// caller-supplied instead of fixed per difficulty.
import {
  getMovementCategory,
  reorderNoConsecutiveCategories,
} from "@/hooks/use-workout";
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
 * Groups a flat step sequence into reorder-safe units: a Double/Half
 * modifier step is always fused with the exercise step right before it into
 * one unit. Unlike solo decks' Ace/King cards — which look backward at
 * runtime to inherit whichever exercise ends up preceding them after
 * shuffling — a CustomWorkoutStep modifier's name and value are baked in at
 * build time (buildCustomWorkoutSteps) for one specific exercise. Moving it
 * away from that exercise (or moving the exercise away from it) would leave
 * the modifier card describing the wrong exercise. Fusing them into a single
 * atomic unit before reordering makes that impossible — the pair only ever
 * moves together, and reorderNoConsecutiveCategories never has to know
 * modifiers exist at all.
 */
function groupIntoUnits(steps: CustomWorkoutStep[]): CustomWorkoutStep[][] {
  const units: CustomWorkoutStep[][] = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    if (step.modifier) continue; // already attached to the unit before it
    const next = steps[i + 1];
    units.push(next?.modifier ? [step, next] : [step]);
  }
  return units;
}

/**
 * Reorders a step sequence so no two units within a 2-card lookback share a
 * movement category — the same rule, and the same reorderNoConsecutiveCategories
 * helper, solo decks use via ensureNoConsecutiveMovementCategories.
 *
 * Best-effort: on a category-skewed pool this can't always fully succeed
 * (see applyExerciseNameVariety below), so it must never be the only pass —
 * always follow it with that final exact-name guarantee.
 */
function applyMovementVariety(
  steps: CustomWorkoutStep[],
): CustomWorkoutStep[] {
  const units = groupIntoUnits(steps);
  const reordered = reorderNoConsecutiveCategories(units, (unit) =>
    getMovementCategory(unit[0]!.name),
  );
  return reordered.flat();
}

/**
 * Final guarantee pass: re-run dedup keyed on the exact exercise name,
 * after movement-category variety above. That pass is best-effort — a pool
 * skewed toward one category (e.g. mostly push-up variants) can make full
 * category variety mathematically unachievable, so on a hard pool it falls
 * back to reshuffle-and-keep-best-attempt, which can still land on an
 * arrangement with two IDENTICAL exercises adjacent (confirmed by
 * simulation against the real catalog, same failure mode solo decks hit —
 * see use-workout.ts's buildLocalDeck). Exact-name avoidance is a strictly
 * easier constraint (far fewer cards share one exact name than share one of
 * only 5 categories), so it succeeds even where full category variety
 * cannot — this is what actually guarantees "no exercise repeats
 * back-to-back", the one rule that must never be violated.
 */
function applyExerciseNameVariety(
  steps: CustomWorkoutStep[],
): CustomWorkoutStep[] {
  const units = groupIntoUnits(steps);
  const reordered = reorderNoConsecutiveCategories(
    units,
    (unit) => unit[0]!.name,
  );
  return reordered.flat();
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
      // Reps clamped to the same 3-10 range every deck/difficulty targets
      // (see clampReps in use-workout.ts) — hold seconds are a different
      // unit entirely and left as authored. Double/Half modifier cards
      // (buildCustomWorkoutSteps) apply on top of this and are
      // deliberately not clamped, same reasoning as Ace/King elsewhere.
      value: ex.isIsometric
        ? (ex.defaultHoldSeconds ?? 20)
        : Math.min(10, Math.max(3, ex.defaultReps ?? 10)),
      eachSide: ex.eachSide,
    }));
    steps = buildCustomWorkoutSteps(exercises);
  }

  // Fix movement-category clustering, then guarantee exact-name variety,
  // on the FINAL assembled sequence (after slicing to cardCount), not on an
  // intermediate draw batch — otherwise a reshuffle mid-draw (the
  // `shuffled.length === 0` branch above) could reintroduce a collision a
  // batch-level fix already resolved.
  return applyExerciseNameVariety(applyMovementVariety(steps.slice(0, cardCount)));
}

export type { CustomWorkoutStep };
