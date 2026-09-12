import { describe, expect, it } from "vitest";
import { drawTrainTogetherSteps } from "./trainTogetherDraw";
import type { TrainTogetherCategory } from "./trainTogetherDraw";

const CATEGORIES: TrainTogetherCategory[] = [
  "UpperBody",
  "LowerBody",
  "FullBody",
];
const CARD_COUNTS = [30, 52, 75];
const RUNS_PER_COMBO = 15;

describe("train together draw simulation — exact-name guarantee", () => {
  for (const category of CATEGORIES) {
    for (const cardCount of CARD_COUNTS) {
      it(`${category}/${cardCount}cards — no exact-name repeat within a 2-card lookback, across ${RUNS_PER_COMBO} runs`, () => {
        for (let run = 0; run < RUNS_PER_COMBO; run++) {
          const steps = drawTrainTogetherSteps(category, cardCount);
          const names = steps.map((s) => s.name);
          // A modifier step intentionally shares its base exercise's name
          // (buildCustomWorkoutSteps) — that adjacency isn't a real repeat,
          // same anchor exemption the solo-deck Ace/King pairing gets.
          for (let i = 0; i < names.length - 1; i++) {
            const j = i + 1;
            const anchor = !!steps[j]!.modifier;
            if (!anchor && names[i] === names[j]) {
              throw new Error(
                `run ${run}: exact-name repeat at index ${i}-${j} ("${names[i]}") in ${JSON.stringify(names)}`,
              );
            }
            if (
              i - 1 >= 0 &&
              !steps[i - 1]!.modifier &&
              !steps[j]!.modifier &&
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
});
