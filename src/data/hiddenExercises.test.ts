import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COMING_SOON_ILLUSTRATION, resolveExerciseIllustration } from "@/data/exerciseAssets";
import { HIDDEN_EXERCISES, isDeckComingSoon } from "@/data/hiddenExercises";
import { buildLocalDeck, getDeckExerciseConfig } from "@/hooks/use-workout";

const fileExists = (src: string) =>
  existsSync(join(process.cwd(), "public", decodeURI(src.replace(/^\//, "").split("?")[0]!)));

const CATS = ["UpperBody", "LowerBody", "Core", "FullBody"] as const;
const LEVELS = ["Beginner", "Advanced", "Pro"] as const;

describe("hidden exercises", () => {
  it("every visible women's card has an existing picture", () => {
    const missing: string[] = [];
    for (const c of CATS)
      for (const l of LEVELS) {
        const cfg = getDeckExerciseConfig(c, l, "female");
        if (!cfg) continue;
        for (const s of Object.values(cfg.suits))
          for (const e of [...Object.values(s.cardMap), s.queen]) {
            if (e.illustrationComingSoon) continue;
            const src = e.imagePath ?? resolveExerciseIllustration(e.exerciseName, "female");
            if (src === COMING_SOON_ILLUSTRATION || !fileExists(src))
              missing.push(`${c} ${l}: ${e.exerciseName} (${src})`);
          }
      }
    expect(missing).toEqual([]);
  });

  it("no hidden exercise ends up in a built deck, and decks stay full", () => {
    for (const c of CATS)
      for (const l of LEVELS) {
        const deck = buildLocalDeck("t", 52, c, l, "female");
        if (isDeckComingSoon(c, l, "female")) {
          expect(deck).toEqual([]);
          continue;
        }
        expect(deck.length).toBeGreaterThanOrEqual(40);
        for (const card of deck)
          expect(HIDDEN_EXERCISES.female.has(card.exerciseName)).toBe(false);
      }
  });

  it("women's Core Pro is coming soon", () => {
    expect(isDeckComingSoon("Core", "Pro", "female")).toBe(true);
    expect(isDeckComingSoon("Core", "Pro", "male")).toBe(false);
    expect(getDeckExerciseConfig("Core", "Pro", "female")).toBeNull();
  });
});
