import { describe, expect, it } from "vitest";
import { buildLocalDeck } from "./use-workout";
import type { DeckCategory, DeckDifficulty } from "@/types/workout";

const CATEGORIES: DeckCategory[] = [
  "UpperBody",
  "LowerBody",
  "Core",
  "FullBody",
];
const DIFFICULTIES: DeckDifficulty[] = ["Beginner", "Advanced", "Pro"];
const GENDERS: ("male" | "female")[] = ["male", "female"];
const CARD_COUNTS = [10, 20, 52];
const RUNS_PER_COMBO = 8; // Math.random is involved — sample repeatedly per combo.

function effectiveExerciseName(
  deck: ReturnType<typeof buildLocalDeck>,
  index: number,
): string {
  const c = deck[index]!;
  if (c.isAce || c.isKing) {
    for (let j = index - 1; j >= 0; j--) {
      const prev = deck[j]!;
      if (!prev.isAce && !prev.isKing) return prev.exerciseName;
    }
    return "";
  }
  return c.exerciseName;
}

describe("full deck build simulation — real exercise catalog — exact-name guarantee", () => {
  for (const category of CATEGORIES) {
    for (const difficulty of DIFFICULTIES) {
      for (const gender of GENDERS) {
        for (const cardCount of CARD_COUNTS) {
          it(`${category}/${difficulty}/${gender}/${cardCount}cards — no exact-name repeat within a 2-card lookback, across ${RUNS_PER_COMBO} runs`, () => {
            for (let run = 0; run < RUNS_PER_COMBO; run++) {
              const deck = buildLocalDeck(
                "sim",
                cardCount,
                category,
                difficulty,
                gender,
                {
                  weightVest: false,
                  resistanceBandLong: false,
                  resistanceBandShort: false,
                  rings: false,
                },
                cardCount,
              );
              if (deck.length === 0) continue; // known-empty combos (e.g. women's Core/FullBody)

              const names: string[] = [];
              for (let i = 0; i < deck.length; i++) {
                names.push(effectiveExerciseName(deck, i));
              }
              for (let i = 0; i < deck.length - 1; i++) {
                const j = i + 1;
                const aMod = deck[i]!.isAce || deck[i]!.isKing;
                const bMod = deck[j]!.isAce || deck[j]!.isKing;
                const anchor = bMod && !aMod;
                if (!anchor && names[i] !== "" && names[i] === names[j]) {
                  throw new Error(
                    `run ${run}: exact-name repeat at index ${i}-${j} ("${names[i]}") in ${JSON.stringify(names)}`,
                  );
                }
                if (
                  i - 1 >= 0 &&
                  names[i - 1] !== "" &&
                  names[j] !== "" &&
                  names[i - 1] === names[j]
                ) {
                  throw new Error(
                    `run ${run}: exact-name repeat (skip-one) at index ${i - 1}-${j} ("${names[j]}") in ${JSON.stringify(names)}`,
                  );
                }
              }
            }
          });
        }
      }
    }
  }
});
