// The Build-Your-Own exercise list for one gender, taken from that gender's
// real decks (all 4 categories × 3 levels), so every exercise in the builder
// is one the user's own decks contain and shows the same picture as its deck
// card. Men build from the men's decks, women from the women's decks, which
// also makes missing illustrations visible per gender.
//
// EXERCISE_CATALOG (data/exerciseCatalog.ts) still supplies defaults (reps,
// hold seconds, body region) where it knows an exercise by the same name.
import { type BodyRegion, type CatalogExercise, EXERCISE_CATALOG } from "@/data/exerciseCatalog";
import { resolveExerciseIllustration } from "@/data/exerciseAssets";
import { type WorkoutGender, getDeckExerciseConfig, getMovementCategory } from "@/hooks/use-workout";
import type { DeckCategory, DeckDifficulty } from "@/types/workout";

export interface GenderCatalogExercise extends CatalogExercise {
  /** The deck card's picture; undefined when the card has none yet. */
  imagePath?: string;
}

const CATEGORIES: DeckCategory[] = ["UpperBody", "LowerBody", "Core", "FullBody"];
const LEVELS: DeckDifficulty[] = ["Beginner", "Advanced", "Pro"];
const BY_NAME = new Map(EXERCISE_CATALOG.map((e) => [e.name.toLowerCase(), e]));
const cache = new Map<WorkoutGender, GenderCatalogExercise[]>();

function regionFor(category: DeckCategory, name: string): BodyRegion {
  if (category !== "FullBody") return category;
  const movement = getMovementCategory(name);
  if (movement === "Legs") return "LowerBody";
  if (movement === "Core") return "Core";
  return "UpperBody";
}

interface DeckEntry {
  exerciseName?: string;
  imagePath?: string;
  illustrationComingSoon?: boolean;
  holdSeconds?: number;
  isIsometric?: boolean;
  reps?: number;
  eachLeg?: boolean;
  eachSide?: boolean;
}

/** Every distinct exercise in this gender's decks, sorted by name. */
export function getGenderCatalog(gender: WorkoutGender): GenderCatalogExercise[] {
  const hit = cache.get(gender);
  if (hit) return hit;
  const map = new Map<string, GenderCatalogExercise>();
  for (const category of CATEGORIES) {
    for (const level of LEVELS) {
      const config = getDeckExerciseConfig(category, level, gender);
      if (!config) continue;
      for (const suit of Object.values(config.suits)) {
        const entries = [...Object.values(suit.cardMap), suit.queen] as DeckEntry[];
        for (const entry of entries) {
          const name = entry?.exerciseName?.trim();
          if (!name || /joker|combo/i.test(name)) continue;
          const image =
            entry.illustrationComingSoon || !entry.imagePath ? undefined : entry.imagePath;
          const existing = map.get(name.toLowerCase());
          if (existing) {
            if (!existing.categories.includes(category)) existing.categories.push(category);
            existing.imagePath ??= image;
            continue;
          }
          const known = BY_NAME.get(name.toLowerCase());
          const hold = (entry.holdSeconds ?? 0) > 0;
          map.set(name.toLowerCase(), {
            name,
            categories: [category],
            movementCategory: known?.movementCategory ?? getMovementCategory(name),
            bodyRegion: known?.bodyRegion ?? regionFor(category, name),
            isIsometric: known?.isIsometric ?? hold,
            defaultHoldSeconds: known?.defaultHoldSeconds ?? (hold ? entry.holdSeconds : undefined),
            defaultReps: known?.defaultReps ?? (hold ? undefined : 10),
            eachSide: known?.eachSide ?? !!(entry.eachSide || entry.eachLeg),
            imagePath: image,
          });
        }
      }
    }
  }
  const list = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  cache.set(gender, list);
  return list;
}

/** The picture for a custom-deck exercise: the same one the workout card
 * shows (ExerciseCard: the card's own image first, else the resolver). A
 * card image that doesn't exist yet becomes "coming soon" (see main.tsx). */
export function customExerciseImage(name: string, gender: WorkoutGender): string {
  const found = getGenderCatalog(gender).find(
    (e) => e.name.toLowerCase() === name.trim().toLowerCase(),
  );
  return found?.imagePath ?? resolveExerciseIllustration(name, gender);
}
