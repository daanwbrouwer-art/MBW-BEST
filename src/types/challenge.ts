export type ChallengeType =
  | "card-volume"
  | "consistency"
  | "variety"
  | "endurance"
  | "streak";

export interface WeeklyChallengeRecord {
  type: ChallengeType;
  /** YYYY-MM-DD, the Monday this challenge was generated for — local timezone, matching the weekly card-limit reset. */
  weekStart: string;
  weekNumber: number;
  target: number;
  unitLabel: string;
  description: string;
  /** Frozen at generation: for "endurance", whether this is the subscriber (Full Deck) or free (2x20-card) variant. Tier changes mid-week never alter an already-generated challenge. */
  isSubscriberVariant: boolean;
  completedAt: string | null;
}

export interface ChallengeProgress {
  current: number;
  target: number;
  completed: boolean;
  pct: number;
}

export interface ChallengeHistoryEntry {
  weekStart: string;
  type: ChallengeType;
  description: string;
  completedAt: string;
}

export const CHALLENGE_TYPE_LABEL: Record<ChallengeType, string> = {
  "card-volume": "Card Volume",
  consistency: "Consistency",
  variety: "Variety",
  endurance: "Endurance",
  streak: "Streak",
};

export const CHALLENGE_TYPE_EMOJI: Record<ChallengeType, string> = {
  "card-volume": "🃏",
  consistency: "📅",
  variety: "🔀",
  endurance: "🔥",
  streak: "⚡",
};
