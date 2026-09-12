import type { LocalCard } from "@/store/workout";
import { describe, expect, it } from "vitest";
import {
  applyCardDistributionAlgorithm,
  ensureNoConsecutiveMovementCategories,
  getMovementCategory,
  reorderNoConsecutiveCategories,
} from "./use-workout";

// ─── Fixture helpers ────────────────────────────────────────────────────────
// Kept deliberately dumb (no shared exercise catalog import) so these tests
// pin the *distribution/shuffle algorithm's* behavior in isolation from the
// exercise-content tables, which change independently.

function card(id: string, overrides: Partial<LocalCard> = {}): LocalCard {
  return {
    id,
    rank: "2",
    suit: "Hearts",
    exerciseName: "Push-Up",
    reps: 10,
    isJoker: false,
    isAce: false,
    isKing: false,
    ...overrides,
  };
}

function joker(id: string): LocalCard {
  return card(id, {
    isJoker: true,
    suit: "Joker",
    rank: "Joker",
    exerciseName: "",
  });
}
function ace(id: string, suit = "Hearts"): LocalCard {
  return card(id, { isAce: true, rank: "Ace", suit, exerciseName: "" });
}
function king(id: string, suit = "Spades"): LocalCard {
  return card(id, { isKing: true, rank: "King", suit, exerciseName: "" });
}

// 5 distinct (exerciseName, suit) pairs spanning all 5 movement categories
// and all 4 real suits, cycled by index — gives fillers enough natural
// variety that they don't themselves trip the suit/category/variety rules
// unless a test deliberately arranges them to.
const FILLER_KINDS: Array<{ exerciseName: string; suit: string }> = [
  { exerciseName: "Push-Up", suit: "Hearts" }, // Push
  { exerciseName: "Row", suit: "Spades" }, // Pull
  { exerciseName: "Squat", suit: "Clubs" }, // Legs
  { exerciseName: "Plank", suit: "Diamonds" }, // Core
  { exerciseName: "Dip", suit: "Hearts" }, // Dip
];
function filler(id: string, kindIndex: number): LocalCard {
  const kind = FILLER_KINDS[kindIndex % FILLER_KINDS.length]!;
  return card(id, { exerciseName: kind.exerciseName, suit: kind.suit });
}

function isModifier(c: LocalCard): boolean {
  return c.isAce || c.isKing;
}
function isJokerCard(c: LocalCard): boolean {
  return c.isJoker;
}

/**
 * Mirrors use-workout.ts's private getCardMovementCategory: an Ace/King
 * inherits the movement category of the nearest preceding non-modifier
 * card (not exported, so re-derived here purely for assertions — this is
 * the documented rule, not a guess).
 */
function effectiveCategoryAt(deck: LocalCard[], index: number): string {
  const c = deck[index]!;
  if (c.isAce || c.isKing) {
    for (let j = index - 1; j >= 0; j--) {
      const prev = deck[j]!;
      if (!prev.isAce && !prev.isKing)
        return getMovementCategory(prev.exerciseName);
    }
    return "";
  }
  return getMovementCategory(c.exerciseName);
}

/** Counts 1-back movement-category collisions using the same "anchor
 * exemption" the real algorithm applies (a modifier directly inheriting its
 * neighbour's category isn't a real collision). Mirrors countCategoryCollisions. */
function countOneBackCategoryCollisions(deck: LocalCard[]): number {
  const eff = deck.map((_, i) => effectiveCategoryAt(deck, i));
  let count = 0;
  for (let i = 0; i < deck.length - 1; i++) {
    const j = i + 1;
    const isAnchorOfModifier = isModifier(deck[j]!) && !isModifier(deck[i]!);
    if (!isAnchorOfModifier && eff[i] !== "" && eff[i] === eff[j]) count++;
    if (
      i - 1 >= 0 &&
      eff[i - 1] !== "" &&
      eff[j] !== "" &&
      eff[i - 1] === eff[j]
    )
      count++;
  }
  return count;
}

describe("applyCardDistributionAlgorithm — Rule 1: Joker Cap", () => {
  it("Beginner/Advanced: keeps only the first joker encountered, drops the rest", () => {
    const deck: LocalCard[] = [
      filler("f0", 0),
      joker("j0"),
      filler("f1", 1),
      joker("j1"),
      filler("f2", 2),
      joker("j2"),
      ace("ace0"),
      king("king0"),
      filler("f3", 3),
      filler("f4", 4),
    ];

    const result = applyCardDistributionAlgorithm(deck, "Beginner", 10);
    const jokers = result.filter((c) => c.isJoker);

    expect(jokers).toHaveLength(1);
    expect(jokers[0]!.id).toBe("j0");
  });

  it("Advanced behaves the same as Beginner for the joker cap", () => {
    const deck: LocalCard[] = [
      joker("j0"),
      filler("f0", 0),
      joker("j1"),
      ace("ace0"),
      king("king0"),
      filler("f1", 1),
      filler("f2", 2),
      filler("f3", 3),
    ];

    const result = applyCardDistributionAlgorithm(deck, "Advanced", 10);
    expect(result.filter((c) => c.isJoker)).toHaveLength(1);
  });

  it("Pro: keeps at most 2 jokers, dropping any beyond the first two encountered", () => {
    const deck: LocalCard[] = [
      filler("f0", 0),
      joker("j0"),
      filler("f1", 1),
      joker("j1"),
      filler("f2", 2),
      joker("j2"),
      joker("j3"),
      ace("ace0"),
      king("king0"),
      filler("f3", 3),
      filler("f4", 4),
    ];

    const result = applyCardDistributionAlgorithm(deck, "Pro", 10);
    const jokerIds = result
      .filter((c) => c.isJoker)
      .map((c) => c.id)
      .sort();

    expect(jokerIds).toEqual(["j0", "j1"]);
  });

  it("Pro: never places two jokers back-to-back, even when both start out early", () => {
    // 60-card deck, single Ace/King within the sessionLength=10 window (so
    // Rule 2 is a no-op and can't perturb joker positions), two jokers
    // planted well before index 24.
    const fillers: LocalCard[] = [];
    for (let i = 0; i < 58; i++) fillers.push(filler(`f${i}`, i));

    const deck: LocalCard[] = [
      fillers[0]!,
      fillers[1]!,
      fillers[2]!,
      joker("jA"), // index 3
      fillers[3]!,
      ace("ace0"), // index 5
      fillers[4]!,
      fillers[5]!,
      king("king0"), // index 8
      fillers[6]!,
      joker("jB"), // index 10
      ...fillers.slice(7),
    ];

    const result = applyCardDistributionAlgorithm(deck, "Pro", 10);

    expect(result.filter((c) => c.isJoker)).toHaveLength(2);
    expect(result.filter((c) => c.isAce)).toHaveLength(1);
    expect(result.filter((c) => c.isKing)).toHaveLength(1);

    const jokerIdxs = result
      .map((c, i) => (c.isJoker ? i : -1))
      .filter((i) => i >= 0);
    // Current behavior: the two jokers never end up adjacent...
    expect(Math.abs(jokerIdxs[1]! - jokerIdxs[0]!)).toBeGreaterThan(1);
    // ...and at least one of them gets pushed out to satisfy the "not
    // before index 24" placement rule (see inline comment below for why
    // this does NOT mean *both* end up past 24 — that's a real gap in the
    // current algorithm, not a test mistake: the "first joker >= 24" check
    // runs once against a snapshot taken before any splice, so a joker that
    // shifts down into a low index as a side effect of an earlier removal
    // is never re-checked).
    expect(Math.max(...jokerIdxs)).toBeGreaterThanOrEqual(24);
  });
});

describe("applyCardDistributionAlgorithm — Rule 2: Ace and King Frequency", () => {
  it("trims excess aces/kings down to the session-length target, keeping the last-encountered survivors", () => {
    const deck: LocalCard[] = [
      filler("f0", 0),
      ace("a0"),
      filler("f1", 1),
      ace("a1"),
      filler("f2", 2),
      ace("a2"),
      king("k0"),
      filler("f3", 3),
      king("k1"),
      filler("f4", 4),
      king("k2"),
    ];

    // sessionLength <= 10 targets exactly 1 Ace + 1 King (see Rule 2 comment
    // in use-workout.ts) — deterministic, no Math.random involved in the count.
    const result = applyCardDistributionAlgorithm(deck, "Beginner", 10);

    const aces = result.filter((c) => c.isAce);
    const kings = result.filter((c) => c.isKing);
    expect(aces).toHaveLength(1);
    expect(kings).toHaveLength(1);
    expect(aces[0]!.id).toBe("a2");
    expect(kings[0]!.id).toBe("k2");
  });

  it("adds missing aces/kings up to the session-length minimum, never leading with one and never placing two back-to-back", () => {
    const deck: LocalCard[] = [];
    for (let i = 0; i < 12; i++) deck.push(filler(`f${i}`, i));

    const result = applyCardDistributionAlgorithm(deck, "Beginner", 10);

    const aces = result.filter((c) => c.isAce);
    const kings = result.filter((c) => c.isKing);
    expect(aces).toHaveLength(1);
    expect(kings).toHaveLength(1);
    expect(isModifier(result[0]!)).toBe(false);

    for (let i = 0; i < result.length - 1; i++) {
      expect(isModifier(result[i]!) && isModifier(result[i + 1]!)).toBe(false);
    }
  });

  it("targets exactly 3 total modifiers for a 20-card session", () => {
    const deck: LocalCard[] = [];
    for (let i = 0; i < 20; i++) deck.push(filler(`f${i}`, i));

    const result = applyCardDistributionAlgorithm(deck, "Advanced", 20);
    const total = result.filter((c) => c.isAce || c.isKing).length;
    expect(total).toBe(3);
  });

  it("targets 4-6 total modifiers for a full 52-card deck", () => {
    const deck: LocalCard[] = [];
    for (let i = 0; i < 52; i++) deck.push(filler(`f${i}`, i));

    const result = applyCardDistributionAlgorithm(deck, "Pro", 52);
    const total = result.filter((c) => c.isAce || c.isKing).length;
    expect(total).toBeGreaterThanOrEqual(4);
    expect(total).toBeLessThanOrEqual(6);
  });
});

describe("applyCardDistributionAlgorithm — Rule 3: No Consecutive Same Suit", () => {
  it("eliminates adjacent same-suit non-modifier/non-joker cards when enough suit variety exists", () => {
    // Exercise names are all distinct (unlike a real deck) so Rule 4
    // (exercise variety, which runs AFTER this rule and reorders purely for
    // name variety with no regard for suit) is guaranteed to be a no-op —
    // otherwise it could reintroduce a suit collision this rule just fixed.
    // The Ace/King are supplied already matching Rule 2's session-length
    // target (1 each, for sessionLength <= 10) and placed inside the
    // visible window, so Rule 2 is *also* a no-op here — with no
    // Math.random calls left anywhere in the pipeline, this fixture's
    // outcome is fully deterministic, unlike a version that lets Rule 2
    // insert the modifiers at a random position (verified: that version is
    // flaky, because Rule 3's swap search only looks forward, so a
    // same-suit collision near the end of the deck is only fixable if
    // enough differing-suit cards happen to remain after it).
    const deck: LocalCard[] = [
      card("c0", { exerciseName: "Push-Up", suit: "Hearts" }),
      card("c1", { exerciseName: "Handstand Hold", suit: "Hearts" }), // collides with c0
      card("c2", { exerciseName: "Squat", suit: "Spades" }),
      card("c3", { exerciseName: "Wall Sit", suit: "Spades" }), // collides with c2
      ace("ace0"),
      card("c4", { exerciseName: "Dip", suit: "Clubs" }),
      card("c5", { exerciseName: "Ring Dip", suit: "Clubs" }), // collides with c4
      card("c6", { exerciseName: "Row", suit: "Diamonds" }),
      card("c7", { exerciseName: "Chin-Up", suit: "Diamonds" }), // collides with c6
      king("king0"),
      card("c8", { exerciseName: "Plank", suit: "Hearts" }),
      card("c9", { exerciseName: "Hollow Hold", suit: "Hearts" }), // collides with c8
      card("c10", { exerciseName: "Pike Hold", suit: "Spades" }),
      card("c11", { exerciseName: "Bicycle Crunch", suit: "Spades" }), // collides with c10
    ];

    const result = applyCardDistributionAlgorithm(deck, "Beginner", 10);

    expect(result.filter((c) => c.isAce)).toHaveLength(1);
    expect(result.filter((c) => c.isKing)).toHaveLength(1);

    let violations = 0;
    for (let i = 0; i < result.length - 1; i++) {
      const a = result[i]!;
      const b = result[i + 1]!;
      if (isModifier(a) || isModifier(b) || isJokerCard(a) || isJokerCard(b)) {
        continue;
      }
      if (a.suit === b.suit && a.suit !== "Joker") violations++;
    }
    expect(violations).toBe(0);
  });
});

describe("getMovementCategory", () => {
  it.each([
    ["Push-Up", "Push"],
    ["Pike Hold", "Push"], // ordering: pike must resolve to Push, not Core
    ["Handstand Hold", "Push"],
    ["Pull-Up", "Pull"],
    ["Row", "Pull"],
    ["Dip", "Dip"],
    ["Ring Dip", "Dip"],
    ["Leg Raise", "Core"], // ordering: leg raise must resolve to Core, not Legs
    ["Sit-Up", "Core"],
    ["Plank", "Core"],
    ["Wall Sit", "Legs"], // ordering: wall sit must resolve to Legs, not Core
    ["Squat", "Legs"],
    ["Burpee", "Legs"],
    ["Some Totally Unknown Exercise", "Core"], // fallback
  ])("%s -> %s", (exerciseName, expected) => {
    expect(getMovementCategory(exerciseName)).toBe(expected);
  });
});

describe("ensureNoConsecutiveMovementCategories (one-card-back movement-category dedup)", () => {
  it("removes 1-back movement-category collisions when enough variety exists", () => {
    const deck: LocalCard[] = [
      card("c0", { exerciseName: "Push-Up", suit: "Hearts" }),
      card("c1", { exerciseName: "Handstand Hold", suit: "Spades" }), // also Push — collides with c0
      card("c2", { exerciseName: "Row", suit: "Clubs" }),
      card("c3", { exerciseName: "Squat", suit: "Diamonds" }),
      card("c4", { exerciseName: "Plank", suit: "Hearts" }),
    ];

    const result = ensureNoConsecutiveMovementCategories(deck);

    expect(countOneBackCategoryCollisions(result)).toBe(0);
    // sanity: fix-up reorders, it doesn't drop or fabricate cards
    expect(result.map((c) => c.id).sort()).toEqual(
      deck.map((c) => c.id).sort(),
    );
  });

  it("resolves a collision created by an Ace's inherited category using a later card, without moving the Ace", () => {
    const deck: LocalCard[] = [
      card("push-a", { exerciseName: "Push-Up", suit: "Hearts" }),
      ace("ace0"), // inherits Push from push-a
      card("pull", { exerciseName: "Row", suit: "Spades" }),
      card("push-c", { exerciseName: "Push-Up", suit: "Clubs" }), // 1-back collides with the Ace's inherited Push
      card("legs", { exerciseName: "Squat", suit: "Diamonds" }),
    ];

    const result = reorderNoConsecutiveCategories(
      deck,
      (_c, index, arr) => effectiveCategoryAt(arr, index),
      (c) => c.isAce || c.isKing,
    );

    expect(countOneBackCategoryCollisions(result)).toBe(0);
    // the modifier guard must hold: the Ace itself never relocates
    expect(result.findIndex((c) => c.id === "ace0")).toBe(
      deck.findIndex((c) => c.id === "ace0"),
    );
  });

  it("leaves an already-collision-free deck untouched", () => {
    const deck: LocalCard[] = [
      card("c0", { exerciseName: "Push-Up", suit: "Hearts" }),
      card("c1", { exerciseName: "Row", suit: "Spades" }),
      card("c2", { exerciseName: "Squat", suit: "Clubs" }),
      card("c3", { exerciseName: "Plank", suit: "Diamonds" }),
      card("c4", { exerciseName: "Dip", suit: "Hearts" }),
    ];

    const result = ensureNoConsecutiveMovementCategories(deck);
    expect(result.map((c) => c.id)).toEqual(deck.map((c) => c.id));
  });
});
