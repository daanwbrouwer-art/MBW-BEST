// Master equipment-suggestion mapping — see
// MBW-equipment-recommendation-system-2026-08-07.md Part 4 (full exercise
// mapping) and Part 3 (rules) for the source of truth. Keys must match
// src/data/exerciseCatalog.ts exactly (165 exercises total; ~110 get a
// mapping here, the rest are high-impact/cardio/skill/combo work that
// intentionally gets no equipment tag — see that doc's "no equipment
// recommended" tables).
import type { EquipmentSuggestion, EquipmentTier } from "@/types/equipment";
import { TIER_INCLUDES } from "@/types/equipment";

export const EQUIPMENT_MAPPING: Record<string, EquipmentSuggestion[]> = {
  // ─── Push — Push-up family ─────────────────────────────────────────────
  "Archer Plyometric Push-up": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  "Archer Push-up": [
    {
      equipment: "elastic",
      direction: "harder",
      label: "Band across back for resistance",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  "Archer Push-up Deep": [
    {
      equipment: "elastic",
      direction: "harder",
      label: "Band across back for resistance",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  "Archer Push-up Standard": [
    {
      equipment: "elastic",
      direction: "harder",
      label: "Band across back for resistance",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  "Decline Push-up": [
    {
      equipment: "elastic",
      direction: "harder",
      label: "Band across back for resistance",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  "Diamond Push-up": [
    {
      equipment: "elastic",
      direction: "harder",
      label: "Band across back for resistance",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  "Incline Push-up": [
    {
      equipment: "elastic",
      direction: "harder",
      label: "Band across back for resistance",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  "Knee Push-up": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Normal Push-up": [
    {
      equipment: "elastic",
      direction: "harder",
      label: "Band across back for resistance",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  "One-arm Push-up Negative": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic band for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Push-up Negative": [
    {
      equipment: "elastic",
      direction: "harder",
      label: "Band across back for resistance",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  "Ring Push-up": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Shoulder Tap Push-up": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Spider-Man Push-up": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Standard Push-up": [
    {
      equipment: "elastic",
      direction: "harder",
      label: "Band across back for resistance",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  "Tricep Push-up": [
    {
      equipment: "elastic",
      direction: "harder",
      label: "Band across back for resistance",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  "Typewriter Push-up": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  "Wide Push-up": [
    {
      equipment: "elastic",
      direction: "harder",
      label: "Band across back for resistance",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  // Clapping Push-up, Decline Push-up to Mountain Climber, Diamond Push-up
  // to Jump Squat, Max Clapping Push-ups, Plyometric Push-up, Push-Up to
  // Down Dog — intentionally excluded (plyometric/combo, Part 4).

  // ─── Push — Pike / Handstand family ────────────────────────────────────
  "Elevated Pike Push-up": [
    {
      equipment: "parallel_bars",
      direction: "harder",
      label: "Parallel bars for deeper ROM",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Handstand Push-up": [
    {
      equipment: "parallel_bars",
      direction: "harder",
      label: "Parallel bars for deeper ROM",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Handstand Push-up Negative": [
    {
      equipment: "parallel_bars",
      direction: "harder",
      label: "Parallel bars for deeper ROM",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Pike Hold": [
    {
      equipment: "parallel_bars",
      direction: "harder",
      label: "Parallel bars for deeper hold",
    },
  ],
  "Pike Push-up": [
    {
      equipment: "parallel_bars",
      direction: "harder",
      label: "Parallel bars for deeper ROM",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Pike Push-up Decline": [
    {
      equipment: "parallel_bars",
      direction: "harder",
      label: "Parallel bars for deeper ROM",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Pike Push-up Elevated": [
    {
      equipment: "parallel_bars",
      direction: "harder",
      label: "Parallel bars for deeper ROM",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Pike Push-up Flat": [
    {
      equipment: "parallel_bars",
      direction: "harder",
      label: "Parallel bars for deeper ROM",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Pike Push-up Slow": [
    {
      equipment: "parallel_bars",
      direction: "harder",
      label: "Parallel bars for deeper ROM",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Wall Handstand Hold": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  // Freestanding Handstand Attempt — excluded (skill work, Part 4).

  // ─── Pull — Pull-up / Chin-up family ───────────────────────────────────
  "Assisted Chin-up": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Assisted Pull-up": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Chin-up": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic under foot for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  "Chin-up with Pause": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic under foot for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  "Close Grip Pull-up": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic under foot for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  "Commando Pull-up": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic under foot for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Explosive Pull-up": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic under foot for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Full Chin-up": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic under foot for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  "L-sit Pull-up": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic under foot for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Negative Chin-up": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Negative Pull-up": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Pull-up": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic under foot for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  "Pull-up Overhand": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic under foot for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  "Pull-up with Pause": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic under foot for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  "Wide Grip Pull-up": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic under foot for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try on rings" },
  ],
  // Burpee Chin-up, Pull-up to Dip Complex — excluded (combo/impact, Part 4).

  // ─── Pull — Row family ──────────────────────────────────────────────────
  "Horizontal Row": [
    {
      equipment: "rings",
      direction: "harder",
      label: "Try on rings for instability",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Incline Row": [
    {
      equipment: "rings",
      direction: "harder",
      label: "Try on rings for instability",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Row Hold": [
    {
      equipment: "rings",
      direction: "harder",
      label: "Try on rings for instability",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],

  // ─── Muscle-Up ──────────────────────────────────────────────────────────
  "Muscle-Up Attempt": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic assist through sticking point",
    },
    { equipment: "rings", direction: "enables", label: "Work on rings" },
  ],

  // ─── Dip family ─────────────────────────────────────────────────────────
  "Bench Dip": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic under legs for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Bench Dip Slow Negative": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic under legs for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Bench Dip Straight-leg": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic under legs for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Chest Dip": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic across bars for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try ring dip" },
  ],
  "Dip Slow Negative": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic under legs for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Elevated Bench Dip": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic under legs for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Parallel Bar Dip": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic across bars for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
    { equipment: "rings", direction: "harder", label: "Try ring dip" },
  ],
  "Ring Dip": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],

  // ─── Legs — Squats (standing) ───────────────────────────────────────────
  BSS: [{ equipment: "vest", direction: "harder", label: "Add weighted vest" }],
  "BSS Deficit": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "BSS Elevated": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "BSS Isometric Hold": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "BSS Normal": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Bulgarian Split Squat": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Narrow Squat": [
    {
      equipment: "elastic",
      direction: "harder",
      label: "Band above knees or under feet",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Normal Squat": [
    {
      equipment: "elastic",
      direction: "harder",
      label: "Band above knees or under feet",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Regular Squat": [
    {
      equipment: "elastic",
      direction: "harder",
      label: "Band above knees or under feet",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Squat Hold": [
    { equipment: "vest", direction: "harder", label: "Weighted vest on back" },
  ],
  "Sumo Squat": [
    {
      equipment: "elastic",
      direction: "harder",
      label: "Band above knees or under feet",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Wall Sit": [
    { equipment: "vest", direction: "harder", label: "Weighted vest on lap" },
  ],
  // Squat to Stand, Squat Thrust — excluded (mobility/cardio-adjacent, Part 4).
  // Jump Squats (30-second Max Jump Squats, Jump Squat, Jump Squat to Jump
  // Lunge, Sumo Jump Squat) — excluded (high impact, Part 4).

  // ─── Legs — Pistol Squats ───────────────────────────────────────────────
  "Assisted Pistol Squat": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Box Pistol Squat": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic anchored above for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Full Pistol Squat": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic anchored above for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Pistol Squat": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic anchored above for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Pistol Squat Isometric": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic anchored above for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  // Pistol Burpee, Pistol Complex, Pistol Squat to Jump — excluded
  // (combo/impact, Part 4).

  // ─── Legs — Shrimp Squats ───────────────────────────────────────────────
  "Shrimp Squat": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic anchored above for assist",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  // Assisted Shrimp Squat — excluded (already an assisted regression, Part 4).

  // ─── Legs — Lunges (vest only per Part 4 table) ────────────────────────
  "Alternating Lunge": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Curtsy Lunge": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Forward Lunge": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Lateral Lunge": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Lunge with Knee Drive": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Lunge with Torso Twist": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Reverse Lunge": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Slow Alternating Lunge": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Walking Lunge": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  // Jump Lunges (Continuous Jump Lunge, Jump Lunge, Jumping Lunge, Jumping
  // Lunges, Lateral Jump Lunge, Non-stop Jump Lunge) — excluded (impact, Part 4).

  // ─── Legs — Step-ups (vest only) ────────────────────────────────────────
  "Box Step-Up": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Single-Leg Step-Up": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Single-Leg Step-up": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Step-Up": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Step-up": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Step-up Hold": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],

  // ─── Legs — Glute Bridges / Hip Thrusts ─────────────────────────────────
  // NOTE: Part 4's per-exercise table gives Donkey Kick Pulse and Glute
  // Kickback elastic-only (no vest) — followed here over the STEPS
  // shortcut that would have grouped them with Two-Leg Glute Bridge's
  // elastic+vest combo. Flagged for review; see verification report.
  "Donkey Kick Pulse": [
    { equipment: "elastic", direction: "harder", label: "Band above knees" },
  ],
  "Elevated Hip Thrust": [
    { equipment: "elastic", direction: "harder", label: "Band above knees" },
    { equipment: "vest", direction: "harder", label: "Weighted vest on hips" },
  ],
  "Glute Bridge Pulse": [
    { equipment: "elastic", direction: "harder", label: "Band above knees" },
    { equipment: "vest", direction: "harder", label: "Weighted vest on hips" },
  ],
  "Glute Kickback": [
    { equipment: "elastic", direction: "harder", label: "Band above knees" },
  ],
  "Hip Thrust Pulse": [
    { equipment: "elastic", direction: "harder", label: "Band above knees" },
    { equipment: "vest", direction: "harder", label: "Weighted vest on hips" },
  ],
  "Single-Leg Glute Bridge": [
    { equipment: "elastic", direction: "harder", label: "Band above knee" },
    { equipment: "vest", direction: "harder", label: "Weighted vest on hips" },
  ],
  "Single-Leg Hip Thrust": [
    { equipment: "elastic", direction: "harder", label: "Band above knee" },
    { equipment: "vest", direction: "harder", label: "Weighted vest on hips" },
  ],
  "Two-Leg Glute Bridge": [
    { equipment: "elastic", direction: "harder", label: "Band above knees" },
    { equipment: "vest", direction: "harder", label: "Weighted vest on hips" },
  ],

  // ─── Legs — Hip Abductors (elastic only) ────────────────────────────────
  Clamshell: [
    { equipment: "elastic", direction: "harder", label: "Band above knees" },
  ],
  "Fire Hydrant": [
    { equipment: "elastic", direction: "harder", label: "Band above knees" },
  ],
  "Side-Lying Hip Abduction": [
    { equipment: "elastic", direction: "harder", label: "Band above knees" },
  ],
  "Standing Hip Abduction": [
    { equipment: "elastic", direction: "harder", label: "Band above knees" },
  ],

  // ─── Legs — Calf Raises (vest only) ─────────────────────────────────────
  "Calf Raise": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Single-Leg Calf Raise": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Standing Calf Raise": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],

  // ─── Legs — Single-leg strength (assorted) ──────────────────────────────
  // Single-Leg Good Morning isn't given an exact mechanism in the source
  // doc — banded good mornings (band around shoulders/feet) is the closest
  // real-world equivalent; flagged for review, see verification report.
  "Single-Leg Good Morning": [
    {
      equipment: "elastic",
      direction: "harder",
      label: "Band for added resistance",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Single-Leg Nordic Curl": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic from above for assist",
    },
  ],
  "Single-Leg RDL": [
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Single-Leg Wall Sit": [
    { equipment: "vest", direction: "harder", label: "Weighted vest on lap" },
  ],
  // Single-Leg Balance Hold — excluded (proprioception, Part 4).

  // ─── Core — Hamstring / Nordic ──────────────────────────────────────────
  "Nordic Curl": [
    {
      equipment: "elastic",
      direction: "easier",
      label: "Elastic from above for assist",
    },
  ],

  // ─── Core — Holds ───────────────────────────────────────────────────────
  "L-sit Hold": [
    {
      equipment: "parallel_bars",
      direction: "harder",
      label: "Parallel bars for deeper compression",
    },
    { equipment: "vest", direction: "harder", label: "Add weighted vest" },
  ],
  "Superman Hold": [
    { equipment: "vest", direction: "harder", label: "Weighted vest on back" },
  ],
  // Burpee Hold — excluded (Burpee family, Part 4).

  // Cross-body Mountain Climber, Mountain Climber — excluded (cardio, Part 4).

  // Full Body — combos/cardio/skill/impact — all excluded (Part 4):
  // Bear Crawl, Bear Crawl Sprint, Box Jump, Box Jump to Squat Hold,
  // Broad Jump, Burpee, Burpee Box Jump, Burpee Broad Jump, Crab Walk,
  // Full Body Combo, High Knee March, High Knees, Inchworm, Jumping Jacks,
  // Lateral Bound, Lateral Bound Hold, Lateral Shuffle, Man Maker,
  // Modified Burpee, Plyometric Burpee, Single-Leg Burpee, Standard Burpee,
  // Tuck Jump, Joker, Joker Combo, Joker Combo (Lower Body).
};

/**
 * Get equipment suggestions for a given exercise, filtered by user's tier.
 * Returns [] if the exercise has no mapping or the user has no relevant equipment.
 */
export function getSuggestionsForExercise(
  exerciseName: string,
  userTier: EquipmentTier,
): EquipmentSuggestion[] {
  const allSuggestions = EQUIPMENT_MAPPING[exerciseName] ?? [];
  const availableEquipment = TIER_INCLUDES[userTier];
  return allSuggestions.filter((s) => availableEquipment.includes(s.equipment));
}
