// Exercises temporarily hidden from the app because their picture file
// doesn't exist yet. Nothing is deleted: the deck data in use-workout.ts is
// untouched, and getDeckExerciseConfig() just leaves these cards out (the
// other exercises of the same suit fill their slots, so every deck stays a
// full deck). When a picture arrives, drop the file into
// public/assets/exercises/ and remove the name here.
// hiddenExercises.test.ts fails if a listed picture appears (so it can be
// un-hidden) or a visible card points at a missing picture.
import type { DeckCategory, DeckDifficulty } from "@/types/workout";

type Gender = "male" | "female";

export const HIDDEN_EXERCISES: Record<Gender, ReadonlySet<string>> = {
  // No men's picture of this exact exercise yet.
  male: new Set<string>([
    "Archer Push-up",
    "Burpee Broad Jump",
    "Commando Pull-up",
    "Man Maker",
    "Plank to Push-up",
    "Ring Dip",
    "Ring Push-up",
    "Sit-up",
  ]),
  female: new Set([
    // No women's picture of this exact exercise yet (the app only had a
    // man's or an old-style drawing).
    "Archer Push-up",
    "Archer Push-up Deep",
    "Archer Push-up Standard",
    "Commando Pull-up",
    "Diamond Push-up",
    "Horizontal Row",
    "Incline Row",
    "Row Hold",
    "Normal Squat",
    "One-arm Push-up Negative",
    "Pull-up to Dip Complex",
    "Ring Dip",
    "Ring Push-up",
    "Side-Lying Hip Abduction",
    "Standing Hip Abduction",
    "Single-Leg Good Morning",
    "Single-Leg Nordic Curl",
    "Squat Thrust",
    // Lower Body
    "Elevated Hip Thrust",
    "Hip Thrust Pulse",
    "Nordic Curl",
    "Fire Hydrant",
    "Lateral Bound",
    "Lateral Bound Hold",
    // Core
    "Bird Dog",
    "Spider-Man Plank",
    "Hanging Oblique Raise",
    "Dragon Flag Negative",
    "Tuck Dragon Flag",
    "Full Dragon Flag",
    "Front Lever Hold",
    "Windshield Wipers Tuck",
    "Windshield Wipers Straight",
    "Hanging L-hold",
    "Planche Lean",
    "Tuck Planche Hold",
    "Straddle Planche Attempt",
    "Hollow Body Planche Rock",
    "Side Plank with Hip Dip",
    "Copenhagen Plank",
    "Human Flag Attempt",
    "Star Side Plank",
    // Full Body
    "Modified Burpee",
    "Crab Walk",
    "Lateral Shuffle",
    "Squat to Stand",
    "Burpee Box Jump",
    "Box Jump",
    "Box Jump to Squat Hold",
    "Spider-Man Push-up",
    "Diamond Push-up to Jump Squat",
    "Explosive Pull-up",
    "Clapping Push-up",
    "Plyometric Push-up",
    "Archer Plyometric Push-up",
    "Max Clapping Push-ups",
    "Pistol Squat to Jump",
    "Pistol Burpee",
    "Typewriter Push-up",
  ]),
};

/** Decks shown as "Coming soon" (too few pictured exercises to play). */
const COMING_SOON_DECKS: Record<Gender, ReadonlyArray<`${DeckCategory}:${DeckDifficulty}`>> = {
  male: [],
  female: ["Core:Pro"],
};

export function isExerciseHidden(name: string | undefined, gender: Gender): boolean {
  return !!name && HIDDEN_EXERCISES[gender].has(name.trim());
}

export function isDeckComingSoon(
  category: DeckCategory | null | undefined,
  difficulty: DeckDifficulty,
  gender: Gender | null | undefined,
): boolean {
  if (!category) return false;
  return COMING_SOON_DECKS[gender === "female" ? "female" : "male"].includes(
    `${category}:${difficulty}`,
  );
}
