import { beforeEach, describe, expect, it } from "vitest";
import { type LocalCard, useWorkoutStore } from "./workout";

function card(id: string, overrides: Partial<LocalCard> = {}): LocalCard {
  return {
    id,
    rank: "5",
    suit: "Spades",
    exerciseName: "Push-up",
    reps: 5,
    isJoker: false,
    isAce: false,
    isKing: false,
    ...overrides,
  };
}

const pikeHold = card("pike", {
  rank: "8",
  exerciseName: "Pike Hold",
  reps: 8,
  holdSeconds: 20,
});

/** Deals `deck` and returns the session card after advancing `steps` times. */
function dealTo(deck: LocalCard[], steps: number) {
  const { setShuffledDeck, advanceDeck } = useWorkoutStore.getState();
  setShuffledDeck(deck, deck.length as never);
  for (let i = 0; i < steps; i++) advanceDeck();
  return useWorkoutStore.getState().currentCard!;
}

describe("Ace / King modifiers", () => {
  beforeEach(() => localStorage.clear());

  it("Ace after a hold doubles the seconds instead of turning it into reps", () => {
    const ace = dealTo(
      [pikeHold, card("ace", { rank: "Ace", isAce: true })],
      2,
    );
    expect(ace.card.exercise).toBe("Pike Hold");
    expect(ace.card.holdSeconds).toBe(40);
  });

  it("King after a hold halves the seconds", () => {
    const king = dealTo(
      [pikeHold, card("king", { rank: "King", isKing: true })],
      2,
    );
    expect(king.card.holdSeconds).toBe(10);
  });

  it("King never halves a hold below 5 seconds", () => {
    const king = dealTo(
      [
        card("short", { exerciseName: "L-sit", holdSeconds: 6 }),
        card("king", { rank: "King", isKing: true }),
      ],
      2,
    );
    expect(king.card.holdSeconds).toBe(5);
  });

  it("Ace after a rep exercise still doubles reps and has no timer", () => {
    const ace = dealTo(
      [card("push", { reps: 7 }), card("ace", { rank: "Ace", isAce: true })],
      2,
    );
    expect(ace.reps).toBe(14);
    expect(ace.card.holdSeconds).toBeUndefined();
  });

  it("keeps the previous exercise's each-leg flag", () => {
    const ace = dealTo(
      [
        card("lunge", { exerciseName: "Lunge", eachLeg: true }),
        card("ace", { rank: "Ace", isAce: true }),
      ],
      2,
    );
    expect(ace.card.eachLeg).toBe(true);
  });
});
