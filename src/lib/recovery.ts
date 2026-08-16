// Adaptive recovery logic — deprioritizes recommending a muscle group
// trained too recently, so the app's "what to train today" nudges point
// toward healthy, varied training rather than repetitive strain. Never
// blocks the user from training whatever they actively pick themselves —
// this only shapes what gets *recommended*.
import { type AchievementSessionRecord, readSessions } from "@/lib/achievementSessionLog";
import { CATEGORY_LABEL } from "@/lib/recommendation";
import { DECK_CATEGORY_LABEL, type DeckCategory } from "@/types/workout";

const ALL_CATEGORIES: DeckCategory[] = ["UpperBody", "LowerBody", "Core", "FullBody"];

// Upper/Lower Body sessions load a specific muscle group hard and need the
// full ~72h window; Core/Full Body distribute load differently and recover
// faster, so they're only deprioritized same-day.
const STRICT_RECOVERY_CATEGORIES: DeckCategory[] = ["UpperBody", "LowerBody"];
const STRICT_RECOVERY_HOURS = 72;
const LENIENT_RECOVERY_HOURS = 24;

export interface MuscleGroupRecency {
  category: DeckCategory;
  lastTrainedAt: number | null;
  hoursAgo: number | null;
  daysAgo: number | null;
}

function latestSessionAt(
  sessions: AchievementSessionRecord[],
  category: DeckCategory,
): number | null {
  return sessions
    .filter((s) => s.deckCategory === category)
    .reduce<number | null>(
      (max, s) => (max === null || s.completedAt > max ? s.completedAt : max),
      null,
    );
}

/** Last-trained date/recency for every deck category, derived live from the achievement session log (works for guests too). */
export function getMuscleGroupRecency(
  isGuest: boolean,
  now: number = Date.now(),
): Record<DeckCategory, MuscleGroupRecency> {
  const sessions = readSessions(isGuest);
  const result = {} as Record<DeckCategory, MuscleGroupRecency>;
  for (const category of ALL_CATEGORIES) {
    const lastTrainedAt = latestSessionAt(sessions, category);
    const hoursAgo = lastTrainedAt === null ? null : (now - lastTrainedAt) / 3_600_000;
    result[category] = {
      category,
      lastTrainedAt,
      hoursAgo,
      daysAgo: hoursAgo === null ? null : Math.floor(hoursAgo / 24),
    };
  }
  return result;
}

function recoveryWindowHours(category: DeckCategory): number {
  return STRICT_RECOVERY_CATEGORIES.includes(category)
    ? STRICT_RECOVERY_HOURS
    : LENIENT_RECOVERY_HOURS;
}

function isWithinRecoveryWindow(recency: MuscleGroupRecency): boolean {
  if (recency.hoursAgo === null) return false;
  return recency.hoursAgo < recoveryWindowHours(recency.category);
}

export interface RecoveryTipInfo {
  trainedCategory: DeckCategory;
  daysAgo: number;
  recommendedCategory: DeckCategory;
}

export interface RecoveryRecommendation {
  category: DeckCategory;
  tip: RecoveryTipInfo | null;
}

/**
 * Swaps a base recommendation away from a muscle group still inside its
 * recovery window, toward the best available alternate (not itself
 * recently trained, oldest-trained-first). Falls back to the original
 * recommendation if every category is currently within its own window —
 * a real constraint (only 4 categories exist) shouldn't produce a
 * nonsensical recommendation.
 */
export function applyRecoveryLogic(
  baseCategory: DeckCategory,
  isGuest: boolean,
  now: number = Date.now(),
): RecoveryRecommendation {
  const recency = getMuscleGroupRecency(isGuest, now);
  const baseRecency = recency[baseCategory];

  if (!isWithinRecoveryWindow(baseRecency)) {
    return { category: baseCategory, tip: null };
  }

  const alternates = ALL_CATEGORIES.filter((c) => c !== baseCategory);
  const ranked = [...alternates].sort((a, b) => {
    const aBlocked = isWithinRecoveryWindow(recency[a]);
    const bBlocked = isWithinRecoveryWindow(recency[b]);
    if (aBlocked !== bBlocked) return aBlocked ? 1 : -1;
    const aAt = recency[a].lastTrainedAt ?? Number.NEGATIVE_INFINITY;
    const bAt = recency[b].lastTrainedAt ?? Number.NEGATIVE_INFINITY;
    return aAt - bAt; // oldest (or never-trained) first
  });
  const alternate = ranked[0];

  if (!alternate || isWithinRecoveryWindow(recency[alternate])) {
    return { category: baseCategory, tip: null };
  }

  return {
    category: alternate,
    tip: {
      trainedCategory: baseCategory,
      daysAgo: baseRecency.daysAgo ?? 0,
      recommendedCategory: alternate,
    },
  };
}

export function formatRecoveryTip(tip: RecoveryTipInfo): string {
  const trainedLabel = CATEGORY_LABEL[tip.trainedCategory];
  const recommendedLabel = DECK_CATEGORY_LABEL[tip.recommendedCategory];
  const whenPhrase =
    tip.daysAgo <= 0 ? "earlier today" : `${tip.daysAgo} ${tip.daysAgo === 1 ? "day" : "days"} ago`;
  return `Recovery tip: your ${trainedLabel} trained ${whenPhrase}, try ${recommendedLabel} today`;
}
