import { getDeckExerciseList, type WorkoutGender } from "@/hooks/use-workout";
import type { DeckCategory, DeckDifficulty } from "@/types/workout";

// shortcut: equipment is inferred from exercise names (the deck data has no
// per-exercise equipment field for bars/benches); add an explicit field if a
// name ever misleads these patterns.
const RULES: { label: string; test: (name: string) => boolean }[] = [
  { label: "pull-up bar", test: (n) => /pull-up|chin-up|hanging|toes to bar|muscle-up|knee raise|knee tuck|\brow\b/i.test(n) },
  { label: "dip bars", test: (n) => /dip/i.test(n) && !/bench|hip dip/i.test(n) },
  { label: "bench or step", test: (n) => /bench|step-up|box|elevated|decline|bss|bulgarian|hip thrust|incline/i.test(n) },
];

/** What a deck level needs beyond bodyweight, e.g. ["pull-up bar", "dip bars"]. */
export function deckEquipment(
  category: DeckCategory,
  difficulty: DeckDifficulty,
  gender: WorkoutGender,
): string[] {
  const names = getDeckExerciseList(category, difficulty, gender);
  return RULES.filter((r) => names.some(r.test)).map((r) => r.label);
}
