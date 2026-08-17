import type { WorkoutGender } from "@/hooks/use-workout";
import { getDeckExerciseConfig } from "@/hooks/use-workout";
import type { EquipmentProfile } from "@/types/user";
import type { DeckCategory } from "@/types/workout";

export interface ProPreviewExercise {
  name: string;
  minReps: number;
  maxReps: number;
  /** True when every occurrence of this exercise is a Queen "challenge" card (no fixed rep count). */
  isChallenge: boolean;
  suit: string;
  imagePath?: string;
  /** True when no accurate illustration exists for this exercise yet. */
  illustrationComingSoon?: boolean;
  requiresEquipment?: keyof EquipmentProfile;
}

export interface ProFlagshipExercise extends ProPreviewExercise {
  description: string;
}

interface RawEntry {
  exerciseName: string;
  imagePath?: string;
  illustrationComingSoon?: boolean;
  requiresEquipment?: keyof EquipmentProfile;
}

function upsert(
  map: Map<string, ProPreviewExercise>,
  entry: RawEntry,
  reps: number,
  suit: string,
  isChallenge: boolean,
): void {
  if (!entry.exerciseName) return;
  const existing = map.get(entry.exerciseName);
  if (!existing) {
    map.set(entry.exerciseName, {
      name: entry.exerciseName,
      minReps: reps,
      maxReps: reps,
      isChallenge,
      suit,
      imagePath: entry.imagePath,
      illustrationComingSoon: entry.illustrationComingSoon,
      requiresEquipment: entry.requiresEquipment,
    });
    return;
  }
  existing.minReps = Math.min(existing.minReps, reps);
  existing.maxReps = Math.max(existing.maxReps, reps);
  existing.isChallenge = existing.isChallenge && isChallenge;
  if (entry.requiresEquipment) existing.requiresEquipment = entry.requiresEquipment;
}

/** Every distinct exercise in a Pro deck, deduped by name with a min-max rep range across all its card occurrences — mirrors the real in-game rep math (reps = card rank value) rather than inventing numbers. */
export function buildProDeckExercises(
  category: DeckCategory,
  gender: WorkoutGender,
): ProPreviewExercise[] {
  const config = getDeckExerciseConfig(category, "Pro", gender);
  if (!config) return [];

  const map = new Map<string, ProPreviewExercise>();
  for (const [suit, suitCfg] of Object.entries(config.suits)) {
    for (const [rankStr, entry] of Object.entries(suitCfg.cardMap)) {
      upsert(map, entry, Number(rankStr), suit, false);
    }
    upsert(map, suitCfg.queen, 0, suit, true);
  }
  if (config.joker) {
    for (const step of config.joker.comboList) {
      upsert(
        map,
        { exerciseName: step.exerciseName, imagePath: config.joker.imagePath },
        step.reps,
        "Joker",
        false,
      );
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Ordered by how instantly recognizable/aspirational the movement is — first
// match wins. Descriptions are short, on-brand taglines for the "flagship"
// highlight cards, not exhaustive coaching cues.
const FLAGSHIP_KEYWORDS: { match: string; description: string }[] = [
  { match: "muscle-up", description: "The ultimate test of upper body pulling and pushing power." },
  { match: "planche", description: "Requires exceptional shoulder strength and full-body control." },
  { match: "one-arm", description: "The pinnacle of single-limb pulling or pushing strength." },
  { match: "human flag", description: "A raw display of full-body core and shoulder strength." },
  { match: "front lever", description: "Elite-level static back and core strength." },
  { match: "freestanding handstand", description: "Balance and body control with zero support." },
  { match: "full pistol squat", description: "Single-leg strength, balance and control in one movement." },
  { match: "full dragon flag", description: "A brutal, full-body core finisher." },
  { match: "handstand push-up", description: "Vertical pressing power at its hardest." },
  { match: "explosive pull-up", description: "Pure power output in a single pull." },
  { match: "man maker", description: "A brutal full-body strength-and-power combo." },
  { match: "burpee chin-up", description: "Total-body conditioning meets pulling strength." },
  { match: "shrimp squat", description: "Single-leg strength most people can't even attempt." },
  { match: "straddle planche", description: "One of the rarest static holds in calisthenics." },
  { match: "full toes to bar", description: "Elite hanging core control, start to finish." },
];

const FLAGSHIP_EXCLUDE = new Set(["Joker Combo", "Combo Finisher"]);

/** Picks 3-4 "flagship" moves to headline the preview — recognizable/aspirational movements first, falling back to the deck's lowest-rep (typically hardest/skill-based) entries so every Pro deck always has something to show. */
export function pickFlagshipExercises(
  exercises: ProPreviewExercise[],
): ProFlagshipExercise[] {
  // Keyword matching runs over every exercise, including "challenge"
  // (hold/negative, no fixed rep count) entries — those are often exactly
  // the aspirational skill moves this section exists to showcase (e.g. a
  // one-arm push-up negative or a freestanding handstand attempt).
  const candidates = exercises.filter((e) => !FLAGSHIP_EXCLUDE.has(e.name));
  const picked: ProFlagshipExercise[] = [];
  const usedNames = new Set<string>();

  for (const kw of FLAGSHIP_KEYWORDS) {
    if (picked.length >= 4) break;
    const found = candidates.find(
      (e) => !usedNames.has(e.name) && e.name.toLowerCase().includes(kw.match),
    );
    if (found) {
      picked.push({ ...found, description: kw.description });
      usedNames.add(found.name);
    }
  }

  // Fallback fill only draws from rep-based entries, sorted lowest-first —
  // low rep counts in these decks are a reliable proxy for difficulty.
  // Challenge entries have no meaningful reps to rank by, so they're only
  // ever picked via a keyword match above, not this fallback.
  if (picked.length < 3) {
    const remaining = candidates
      .filter((e) => !usedNames.has(e.name) && !e.isChallenge)
      .sort((a, b) => a.minReps - b.minReps);
    for (const e of remaining) {
      if (picked.length >= 4) break;
      picked.push({ ...e, description: "One of the toughest moves in this deck." });
      usedNames.add(e.name);
    }
  }

  return picked.slice(0, 4);
}

export const EQUIPMENT_LABEL: Record<keyof EquipmentProfile, string> = {
  weightVest: "Weight Vest",
  resistanceBandLong: "Resistance Band",
  resistanceBandShort: "Resistance Band",
  rings: "Rings",
};
