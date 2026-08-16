import type { DeckCategory, DeckDifficulty } from "@/types/workout";

export interface Recommendation {
  category: DeckCategory;
  difficulty: DeckDifficulty;
  reason: string;
}

const DIFFICULTY_RANK: Record<DeckDifficulty, number> = {
  Beginner: 0,
  Advanced: 1,
  Pro: 2,
};

function lowerDifficulty(a: DeckDifficulty, b: DeckDifficulty): DeckDifficulty {
  return DIFFICULTY_RANK[a] <= DIFFICULTY_RANK[b] ? a : b;
}

/** Base difficulty suggested purely by how the user described themselves. */
function difficultyFromSelfAssessment(
  selfAssessment: string | null,
  fitnessLevel: number,
): DeckDifficulty {
  switch (selfAssessment) {
    case "I am new to fitness.":
      return "Beginner";
    case "I need help getting back into a routine.":
      return fitnessLevel < 30 ? "Beginner" : "Advanced";
    case "I exercise often because it's good for me.":
      return "Advanced";
    case "I aim for excellence and advanced skills.":
      return fitnessLevel < 70 ? "Advanced" : "Pro";
    // "I train for longevity and long-term health." and anything
    // unrecognized: default to a middle-ground suggestion.
    default:
      return "Advanced";
  }
}

/** The fitness slider acts as a hard cap — never recommend above this band. */
function difficultyCapFromFitnessLevel(fitnessLevel: number): DeckDifficulty {
  if (fitnessLevel <= 25) return "Beginner";
  if (fitnessLevel <= 60) return "Advanced";
  return "Pro";
}

// Each goal maps to the category it best serves. Checked in the user's own
// priority order — the first goal with a mapping wins, so a higher-priority
// goal always beats a lower-priority one even if both would match.
const GOAL_TO_CATEGORY: Record<string, DeckCategory> = {
  "Build muscle": "UpperBody",
  "Burn fat": "FullBody",
  "Improve flexibility": "Core",
  "Increase endurance": "FullBody",
  "Improve your body": "FullBody",
  "Relieve stress": "Core",
};

const DEFAULT_CATEGORY: DeckCategory = "FullBody";

function categoryFromGoals(goals: string[]): DeckCategory {
  for (const goal of goals) {
    const match = GOAL_TO_CATEGORY[goal];
    if (match) return match;
  }
  return DEFAULT_CATEGORY;
}

export const CATEGORY_LABEL: Record<DeckCategory, string> = {
  UpperBody: "upper body",
  LowerBody: "lower body",
  Core: "core",
  FullBody: "full body",
};

const DIFFICULTY_DESCRIPTOR: Record<DeckDifficulty, string> = {
  Beginner: "beginner",
  Advanced: "intermediate",
  Pro: "advanced",
};

function buildReason(
  goals: string[],
  difficulty: DeckDifficulty,
  category: DeckCategory,
): string {
  const topGoal = goals[0]?.toLowerCase();
  const goalPhrase = topGoal
    ? `your goal to ${topGoal}`
    : `a well-rounded ${CATEGORY_LABEL[category]} focus`;
  return `Based on ${goalPhrase} and your ${DIFFICULTY_DESCRIPTOR[difficulty]} fitness level.`;
}

export function getRecommendation(input: {
  goals: string[];
  fitnessLevel: number | null;
  selfAssessment: string | null;
}): Recommendation {
  const fitnessLevel = input.fitnessLevel ?? 0;
  const suggested = difficultyFromSelfAssessment(
    input.selfAssessment,
    fitnessLevel,
  );
  const cap = difficultyCapFromFitnessLevel(fitnessLevel);
  const difficulty = lowerDifficulty(suggested, cap);
  const category = categoryFromGoals(input.goals);

  return {
    category,
    difficulty,
    reason: buildReason(input.goals, difficulty, category),
  };
}

// Kept as thin wrappers so any other call site that only needs one half of
// the recommendation doesn't have to reconstruct the whole input object.
export function getRecommendedCategory(goals: string[]): DeckCategory {
  return categoryFromGoals(goals);
}

export function getRecommendedDifficulty(
  fitnessLevel: number | null,
  selfAssessment: string | null = null,
): DeckDifficulty {
  const level = fitnessLevel ?? 0;
  return lowerDifficulty(
    difficultyFromSelfAssessment(selfAssessment, level),
    difficultyCapFromFitnessLevel(level),
  );
}
