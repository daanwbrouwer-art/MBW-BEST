import { CardCount } from "@/backend";
import { getCardsDrawnThisWeek } from "@/lib/streak";
import type { AppTier } from "@/hooks/use-tier";
import type { DeckDifficulty } from "@/types/workout";

export const GUEST_WEEKLY_CARD_LIMIT = 10;
export const REGISTERED_WEEKLY_CARD_LIMIT = 20;

// ─── Tier-gated deck difficulty ────────────────────────────────────────────

const DIFFICULTY_RANK: Record<DeckDifficulty, number> = {
  Beginner: 0,
  Advanced: 1,
  Pro: 2,
};

const MAX_DIFFICULTY_FOR_TIER: Record<AppTier, DeckDifficulty> = {
  guest: "Beginner",
  registered: "Advanced",
  subscriber: "Pro",
};

export function maxDifficultyForTier(tier: AppTier): DeckDifficulty {
  return MAX_DIFFICULTY_FOR_TIER[tier];
}

export function isDifficultyLocked(
  difficulty: DeckDifficulty,
  tier: AppTier,
): boolean {
  return DIFFICULTY_RANK[difficulty] > DIFFICULTY_RANK[MAX_DIFFICULTY_FOR_TIER[tier]];
}

/** Caps a difficulty down to the highest one the tier actually has access to — used to close the "Recommended for you" shortcut around DecksPage's own lock check. */
export function capDifficultyToTier(
  difficulty: DeckDifficulty,
  tier: AppTier,
): DeckDifficulty {
  return DIFFICULTY_RANK[difficulty] > DIFFICULTY_RANK[MAX_DIFFICULTY_FOR_TIER[tier]]
    ? MAX_DIFFICULTY_FOR_TIER[tier]
    : difficulty;
}

// ─── Tier-gated card count ──────────────────────────────────────────────────

/** Which tier is the *minimum* required to use this card count — "registered" for 20, "subscriber" for Full Deck/Custom. */
export function unlockTierForCardCount(count: CardCount | "Custom"): AppTier {
  if (count === "Custom") return "subscriber";
  switch (count) {
    case CardCount.Ten:
      return "guest";
    case CardCount.Twenty:
      return "registered";
    default:
      return "subscriber"; // FullDeck
  }
}

const TIER_RANK: Record<AppTier, number> = {
  guest: 0,
  registered: 1,
  subscriber: 2,
};

export function isCardCountLocked(
  count: CardCount | "Custom",
  tier: AppTier,
): boolean {
  return TIER_RANK[tier] < TIER_RANK[unlockTierForCardCount(count)];
}

/** null = unlimited (subscriber, or an active trial's effective tier). */
export function weeklyCardLimitFor(tier: AppTier): number | null {
  if (tier === "guest") return GUEST_WEEKLY_CARD_LIMIT;
  if (tier === "registered") return REGISTERED_WEEKLY_CARD_LIMIT;
  return null;
}

export interface CardLimitCheck {
  allowed: boolean;
  limit: number | null;
  cardsUsedThisWeek: number;
  remaining: number | null;
}

/** Checks whether drawing `requestedCount` more cards this week would exceed the tier's weekly allowance. */
export function checkWeeklyCardLimit(
  effectiveTier: AppTier,
  isGuest: boolean,
  requestedCount: number,
): CardLimitCheck {
  const limit = weeklyCardLimitFor(effectiveTier);
  if (limit === null) {
    return { allowed: true, limit: null, cardsUsedThisWeek: 0, remaining: null };
  }
  const used = getCardsDrawnThisWeek(isGuest);
  const remaining = Math.max(0, limit - used);
  return {
    allowed: used + requestedCount <= limit,
    limit,
    cardsUsedThisWeek: used,
    remaining,
  };
}
