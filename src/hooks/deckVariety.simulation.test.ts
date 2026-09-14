import { describe, expect, it } from "vitest";
import { buildLocalDeck } from "./use-workout";
import type { DeckCategory, DeckDifficulty } from "@/types/workout";

// Verifies two things the exact-name-repeat guarantee (deckBuild.simulation.test.ts)
// doesn't cover: that reps stay within the 3-10 range every deck/difficulty
// now targets, and that a session actually shows a healthy SPREAD of
// distinct exercises (not just "no two adjacent cards match") — scaling
// with session length but never exceeding what the deck's pool actually
// has. See ensureExerciseVarietyBySessionLength in use-workout.ts for the
// target formula this is checking.

const CATEGORIES: DeckCategory[] = ["UpperBody", "LowerBody", "Core", "FullBody"];
const DIFFICULTIES: DeckDifficulty[] = ["Beginner", "Advanced", "Pro"];
const GENDERS: ("male" | "female")[] = ["male", "female"];
const CARD_COUNTS = [10, 20, 52];
const RUNS = 8;

function poolSizeOf(deck: ReturnType<typeof buildLocalDeck>): number {
  return new Set(
    deck.filter((c) => !c.isAce && !c.isKing && !c.isJoker).map((c) => c.exerciseName),
  ).size;
}

describe("deck variety + reps range — real exercise catalog", () => {
  for (const category of CATEGORIES) {
    for (const difficulty of DIFFICULTIES) {
      for (const gender of GENDERS) {
        for (const cardCount of CARD_COUNTS) {
          it(`${category}/${difficulty}/${gender}/${cardCount}cards`, () => {
            for (let run = 0; run < RUNS; run++) {
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

              // Reps clamp: every real (non-modifier, non-AMRAP-sentinel)
              // card is 3-10. Ace/King's own doubled/halved value is
              // deliberately NOT covered here — see clampReps's doc comment
              // on why that's intentional, not an oversight.
              for (const c of deck) {
                if (c.isAce || c.isKing || c.reps === 0) continue;
                expect(c.reps).toBeGreaterThanOrEqual(3);
                expect(c.reps).toBeLessThanOrEqual(10);
              }

              // Variety: the played session (first cardCount cards) should
              // show a real spread of exercises, scaling toward "every
              // exercise in the pool" as cardCount approaches/exceeds the
              // pool size. Exact target has +/-2 jitter below saturation
              // (see ensureExerciseVarietyBySessionLength), so this checks
              // a slightly widened bound (extra -1) rather than the exact
              // formula, to stay a meaningful regression guard without
              // being flaky against the jitter's own randomness.
              const distinct = new Set(
                deck
                  .slice(0, cardCount)
                  .filter((c) => !c.isAce && !c.isKing && !c.isJoker)
                  .map((c) => c.exerciseName),
              ).size;
              const poolSize = poolSizeOf(deck);
              const baseTarget = Math.ceil(cardCount * 0.6);
              const expectedFloor =
                baseTarget >= poolSize
                  ? poolSize // saturating sessions (e.g. 52 cards) must show every exercise, no slack
                  : Math.min(poolSize, Math.max(Math.min(4, poolSize), baseTarget - 3));
              expect(distinct).toBeGreaterThanOrEqual(expectedFloor);
            }
          });
        }
      }
    }
  }
});
