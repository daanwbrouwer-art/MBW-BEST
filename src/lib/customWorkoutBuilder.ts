// Builds the ordered sequence of "steps" a custom workout session walks
// through — the user's picked exercises, plus the same Double (Ace) / Half
// (King) modifier cards the real card decks use, inserted automatically so
// custom workouts get the same game feel instead of being a plain checklist.
import type { CustomWorkoutExercise } from "@/store/customWorkout";

export interface CustomWorkoutStep {
  key: string;
  name: string;
  isIsometric: boolean;
  value: number;
  eachSide: boolean;
  /** Set when this step is a modifier card referencing the exercise right before it, not a new exercise. */
  modifier?: "double" | "half";
}

/** How many real exercises between each inserted modifier card (~1 in 4, close to the real deck's ~1-in-6.5 density without leaving short custom workouts modifier-free). */
const MODIFIER_INTERVAL = 4;

/** Modifiers never push a hold under this many seconds or reps under 1. */
const MIN_ISOMETRIC_SECONDS = 5;

function applyModifier(
  base: CustomWorkoutExercise,
  kind: "double" | "half",
): number {
  if (kind === "double") return base.value * 2;
  if (base.isIsometric) {
    return Math.max(MIN_ISOMETRIC_SECONDS, Math.round(base.value / 2));
  }
  return Math.max(1, Math.round(base.value / 2));
}

/**
 * Interleaves Double/Half modifier cards into the user's exercise picks.
 * Deterministic and pure — same input always produces the same sequence, so
 * callers should compute this once (e.g. via a lazy useState initializer)
 * rather than on every render.
 */
export function buildCustomWorkoutSteps(
  selected: CustomWorkoutExercise[],
): CustomWorkoutStep[] {
  const steps: CustomWorkoutStep[] = [];
  let modifierToggle: "double" | "half" = "double";

  selected.forEach((exercise, i) => {
    steps.push({
      key: `ex-${i}-${exercise.name}`,
      name: exercise.name,
      isIsometric: exercise.isIsometric,
      value: exercise.value,
      eachSide: exercise.eachSide,
    });

    const isModifierSlot = (i + 1) % MODIFIER_INTERVAL === 0;
    if (isModifierSlot) {
      steps.push({
        key: `mod-${i}-${modifierToggle}`,
        name: exercise.name,
        isIsometric: exercise.isIsometric,
        value: applyModifier(exercise, modifierToggle),
        eachSide: exercise.eachSide,
        modifier: modifierToggle,
      });
      modifierToggle = modifierToggle === "double" ? "half" : "double";
    }
  });

  return steps;
}
