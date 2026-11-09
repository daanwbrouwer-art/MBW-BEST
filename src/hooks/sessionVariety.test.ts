import { describe, expect, it } from "vitest";
import { isDeckComingSoon } from "@/data/hiddenExercises";
import { buildLocalDeck } from "@/hooks/use-workout";
import { capCaloriesByTime } from "@/lib/calories";

const CATS = ["UpperBody", "LowerBody", "Core", "FullBody"] as const;
const LEVELS = ["Beginner", "Advanced", "Pro"] as const;
const exercisesOf = (deck: any[]) =>
  deck.filter((c) => !c.isAce && !c.isKing && !c.isJoker && !c.jokerComboList).map((c) => c.exerciseName as string);

describe("10-card session variety", () => {
  for (const gender of ["female", "male"] as const)
    it(`${gender}: at least 6 distinct and no exercise more than 2x (when the pool allows)`, () => {
      const problems: string[] = [];
      for (const c of CATS)
        for (const l of LEVELS) {
          if (isDeckComingSoon(c, l, gender)) continue;
          const pool = new Set(exercisesOf(buildLocalDeck("p", 52, c, l, gender))).size;
          for (let run = 0; run < 30; run++) {
            const names = exercisesOf(buildLocalDeck(`s${run}`, 10, c, l, gender));
            const counts = new Map<string, number>();
            for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
            const max = Math.max(...counts.values());
            if (pool >= 6 && counts.size < Math.min(6, names.length)) problems.push(`${c} ${l}: ${counts.size} distinct`);
            if (pool >= 5 && max > 2) problems.push(`${c} ${l}: one exercise x${max}`);
          }
        }
      expect([...new Set(problems)]).toEqual([]);
    }, 120_000); // deals 30 sessions x 12 decks
});

describe("calorie cap", () => {
  it("never exceeds 14 kcal per minute of real time", () => {
    expect(capCaloriesByTime(50, 28)).toBe(6);
    expect(capCaloriesByTime(30, 600)).toBe(30);
    expect(capCaloriesByTime(10, 0)).toBe(0);
  });
});
