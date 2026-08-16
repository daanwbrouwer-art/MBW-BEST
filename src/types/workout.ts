import type {
  Card,
  CardCount,
  Deck,
  JokerChallenge,
  Rank,
  RepSpec,
  SessionCard,
  Suit,
  WorkoutSessionView,
  WorkoutSummary,
} from "@/backend";

export type {
  Card,
  Deck,
  SessionCard,
  WorkoutSessionView,
  WorkoutSummary,
  JokerChallenge,
  CardCount,
  Suit,
  Rank,
  RepSpec,
};

export interface WorkoutState {
  selectedDeck: Deck | null;
  selectedCardCount: CardCount | null;
  sessionId: bigint | null;
  sessionView: WorkoutSessionView | null;
  currentCard: SessionCard | null;
  previousCard: SessionCard | null;
  summary: WorkoutSummary | null;
  isShuffling: boolean;
  isFlipping: boolean;
  jokerActive: boolean;
  jokerChallenge: JokerChallenge | null;
  playedCards: SessionCard[];
}

export type SuitSymbol = "♥" | "♠" | "♦" | "♣" | "🃏";
export type SuitColor = "red" | "black" | "joker";

export const SUIT_SYMBOL: Record<string, SuitSymbol> = {
  Hearts: "♥",
  Spades: "♠",
  Diamonds: "♦",
  Clubs: "♣",
  Joker: "🃏",
};

export const SUIT_COLOR: Record<string, SuitColor> = {
  Hearts: "red",
  Spades: "black",
  Diamonds: "red",
  Clubs: "black",
  Joker: "joker",
};

export const RANK_LABEL: Record<string, string> = {
  Two: "2",
  Three: "3",
  Four: "4",
  Five: "5",
  Six: "6",
  Seven: "7",
  Eight: "8",
  Nine: "9",
  Ten: "10",
  Jack: "J",
  Queen: "Q",
  King: "K",
  Ace: "A",
  Joker: "JOKER",
};

export const CARD_COUNT_LABEL: Record<string, string> = {
  Ten: "10 Cards",
  Twenty: "20 Cards",
  FullDeck: "52 Cards — Full Challenge",
};

export const JOKER_CHALLENGE_LABEL: Record<string, string> = {
  DeadHang30: "Dead Hang for 30 seconds",
};

export const JOKER_CHALLENGE_EMOJI: Record<string, string> = {
  DeadHang30: "🙌",
};

// ─── Category & Difficulty ───────────────────────────────────────────────────

export type DeckCategory = "UpperBody" | "LowerBody" | "Core" | "FullBody";
export type DeckDifficulty = "Beginner" | "Advanced" | "Pro";

export const DECK_CATEGORY_LABEL: Record<DeckCategory, string> = {
  UpperBody: "Upper Body",
  LowerBody: "Lower Body",
  Core: "Core",
  FullBody: "Full Body",
};

export const DECK_CATEGORY_DESCRIPTION: Record<DeckCategory, string> = {
  UpperBody: "Push, pull, and press your way up",
  LowerBody: "Squat, lunge, and power through",
  Core: "Strengthen the foundation from within",
  FullBody: "Total body challenge every draw",
};

export const DECK_CATEGORY_ICON: Record<DeckCategory, string> = {
  UpperBody: "💪",
  LowerBody: "🦵",
  Core: "🔥",
  FullBody: "⚡",
};

export const DECK_DIFFICULTY_LABEL: Record<DeckDifficulty, string> = {
  Beginner: "Beginner",
  Advanced: "Advanced",
  Pro: "Pro",
};

export const DECK_DIFFICULTY_DESCRIPTION: Record<DeckDifficulty, string> = {
  Beginner: "Build the foundation",
  Advanced: "Real intensity",
  Pro: "The game plays you back",
};
