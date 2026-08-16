import { useAchievements } from "@/hooks/use-achievements";
import { useProfile } from "@/hooks/use-profile";
import { readStreak } from "@/lib/streak";
import { processTrialExpiryOnce } from "@/lib/trial";
import type { TrialSummaryStats } from "@/types/trial";
import { useCallback, useState } from "react";

/**
 * Detects — once per browser session, on whichever page mounts this hook
 * first (intended to be Home, "on first app open") — whether a trial has
 * just expired, and if so surfaces the one-time full-screen summary modal.
 * The underlying `trial.active` flag flips to false on the same call, so a
 * second mount (e.g. navigating away and back) never re-triggers it.
 */
export function useTrialExpiryModal() {
  const [justExpired] = useState(() => processTrialExpiryOnce());
  const [dismissed, setDismissed] = useState(false);
  const { unlockedCount } = useAchievements();
  const { data: profile } = useProfile();

  const showModal = justExpired && !dismissed;

  const stats: TrialSummaryStats = (() => {
    // Trial always starts at registration on a brand-new account, so its
    // entire history (registered-user streak bucket) falls within the
    // trial window — no separate date filtering needed.
    const streak = readStreak(false);
    const cardsDrawn = streak.history.reduce((sum, h) => sum + h.cardsDrawn, 0);
    return {
      cardsDrawn,
      workoutsCompleted: Number(profile?.totalWorkouts ?? 0),
      daysTrained: streak.history.length,
      achievementsUnlocked: unlockedCount,
    };
  })();

  const dismiss = useCallback(() => setDismissed(true), []);

  return { showModal, stats, dismiss };
}

/** How many times the user played a given Pro deck (matched by its "Pro {Category}" label) — powers the "pick up where you left off" post-trial nudge. */
export function countProDeckPlays(deckLabel: string): number {
  const streak = readStreak(false);
  return streak.history.filter((h) => h.deckUsed === deckLabel).length;
}
