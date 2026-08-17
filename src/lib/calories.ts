// Shared per-exercise calorie calculator — the single source of truth used
// by both the pre-workout estimate (WorkoutSetupPage) and the live/final
// post-workout total (use-workout.ts's getWorkoutStats, surfaced on
// WorkoutSessionPage + WorkoutSummaryPage). Previously these two screens
// used unrelated formulas (static per-card-count copy vs. a flat
// 3.5 cal/card), which is why the pre-workout estimate never matched what
// the summary screen reported for the same session.
//
// Uses `import type` for MovementCategory so this module has no runtime
// dependency on use-workout.ts — callers there compute the category via
// getMovementCategory() and pass it in, avoiding a circular import.
import type { MovementCategory } from "@/hooks/use-workout";

/** Used whenever the user hasn't completed the onboarding body-metrics step yet. */
export const DEFAULT_WEIGHT_KG = 70;
export const DEFAULT_AGE = 30;
export const DEFAULT_HEIGHT_CM = 170;

/** Midpoint of the WHO "normal" BMI range (18.5–24.9) — the neutral point
 * for the calorie multiplier below. */
const NORMAL_BMI = 22;

/** Roughly how long one rep takes (concentric + eccentric), for converting
 * a rep count into a duration when estimating calories. */
const SECONDS_PER_REP = 3;

/**
 * MET (Metabolic Equivalent of Task) per movement category — rough,
 * well-established averages for bodyweight calisthenics performed at
 * moderate-to-vigorous effort (ACSM Compendium of Physical Activities).
 * Legs is highest since most Legs cards in this app are jump/plyometric
 * variants (jump squats, broad jumps, burpees), not just static squats.
 */
const MET_BY_CATEGORY: Record<MovementCategory, number> = {
  Push: 8,
  Pull: 8,
  Dip: 8,
  Core: 5,
  Legs: 9,
};

/**
 * MET is assigned per movement category above, which flattens a real
 * difference within Legs (and, less often, Push/Pull/Core): explosive/
 * plyometric reps — jump squats, broad jumps, lateral bounds, burpees,
 * clapping/plyo push-ups — cost measurably more per rep than a controlled
 * rep of the same category (ACSM's compendium puts plyometric/jump
 * training around 11-12 MET vs ~8 MET for moderate calisthenics, roughly a
 * 1.35x step up). Detected by keyword since these cards span every
 * category and deck rather than being their own MovementCategory.
 */
const EXPLOSIVE_MET_MULTIPLIER = 1.35;
const EXPLOSIVE_KEYWORDS = [
  "jump",
  "explosive",
  "plyo",
  "clapping",
  "burpee",
  "bound",
];

function isExplosiveExercise(exerciseName?: string): boolean {
  if (!exerciseName) return false;
  const lower = exerciseName.toLowerCase();
  return EXPLOSIVE_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Standard kcal/min formula: MET * 3.5 * bodyWeightKg / 200. */
function caloriesPerMinute(met: number, weightKg: number): number {
  return (met * 3.5 * weightKg) / 200;
}

/**
 * Resting metabolic rate softens gradually with age — applies a mild
 * multiplier so older users get a slightly more conservative estimate
 * and younger users a slightly higher one, centered on DEFAULT_AGE.
 * Deliberately subtle (±15% at the slider extremes) since this is a
 * workout calorie estimate, not a clinical BMR calculation.
 */
function ageFactor(age: number): number {
  const delta = age - DEFAULT_AGE;
  return Math.max(0.85, Math.min(1.1, 1 - delta * 0.0025));
}

/** BMI (kg/m²) from weight and height — standard formula. */
export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  if (heightM <= 0) return 0;
  return weightKg / (heightM * heightM);
}

export type BMICategory = "underweight" | "normal" | "overweight" | "obese";

/** WHO BMI band for the onboarding/profile display. */
export function getBMICategory(bmi: number): BMICategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

/**
 * Mild multiplier on top of the MET*weight formula: moving bodyweight at a
 * higher BMI takes modestly more effort per rep than the flat formula alone
 * accounts for, and vice versa for a lower BMI. Deliberately subtle (±15% at
 * typical extremes) and centered on the normal-BMI midpoint — same spirit as
 * ageFactor above, not a clinical adjustment.
 */
function bmiFactor(bmi: number): number {
  if (bmi <= 0) return 1;
  const delta = bmi - NORMAL_BMI;
  return Math.max(0.85, Math.min(1.15, 1 + delta * 0.008));
}

export interface CardCalorieInput {
  movementCategory: MovementCategory;
  /** Rep count, for rep-based cards. Ignored when holdSeconds is set. */
  reps?: number;
  /** Hold duration in seconds, for isometric cards. Takes priority over reps. */
  holdSeconds?: number;
  /** Doubles the estimated duration — the exercise is performed per side/leg. */
  eachLeg?: boolean;
  eachSide?: boolean;
  weightKg?: number;
  age?: number;
  heightCm?: number;
  /** Used to detect explosive/plyometric variants for the MET bump above —
   * optional because Ace/King modifier cards don't carry their own name. */
  exerciseName?: string;
}

/** Estimated calories burned for a single card, given how it's actually performed. */
export function estimateCardCalories({
  movementCategory,
  reps,
  holdSeconds,
  eachLeg,
  eachSide,
  weightKg,
  age,
  heightCm,
  exerciseName,
}: CardCalorieInput): number {
  const resolvedWeight = weightKg ?? DEFAULT_WEIGHT_KG;
  const resolvedAge = age ?? DEFAULT_AGE;
  const resolvedHeight = heightCm ?? DEFAULT_HEIGHT_CM;
  const bmi = calculateBMI(resolvedWeight, resolvedHeight);
  const baseMet = MET_BY_CATEGORY[movementCategory] ?? 6;
  const met = isExplosiveExercise(exerciseName)
    ? baseMet * EXPLOSIVE_MET_MULTIPLIER
    : baseMet;
  const perMinute =
    caloriesPerMinute(met, resolvedWeight) *
    ageFactor(resolvedAge) *
    bmiFactor(bmi);

  let durationSeconds: number;
  if (typeof holdSeconds === "number" && holdSeconds > 0) {
    durationSeconds = holdSeconds;
  } else {
    const sideMultiplier = eachLeg || eachSide ? 2 : 1;
    durationSeconds = (reps ?? 10) * sideMultiplier * SECONDS_PER_REP;
  }

  return (perMinute / 60) * durationSeconds;
}
