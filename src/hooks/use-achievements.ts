import {
  type AchievementView,
  buildAchievementContext,
  computeAchievementViews,
  markAllAchievementsSeen,
} from "@/lib/achievementEngine";
import { useStreak } from "@/hooks/use-streak";
import { useTier } from "@/hooks/use-tier";
import { ALL_ACHIEVEMENTS } from "@/types/achievements";

export function useAchievements() {
  const { streak, isGuest } = useStreak();
  const { isSubscriber } = useTier();

  const ctx = buildAchievementContext(isGuest, streak);
  const achievements: AchievementView[] = computeAchievementViews(ctx, isSubscriber);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  // Hidden achievements that haven't been unlocked yet don't count toward
  // the header ratio ("47 / 52 unlocked") — Part 2: "hidden ones not
  // counted in the total until discovered". They still render as "?" cards
  // in the grid itself (`achievements` below is the full, unfiltered list)
  // — only this ratio's denominator excludes them.
  const totalVisibleCount = achievements.filter((a) => !a.hidden || a.unlocked).length;

  return {
    achievements,
    unlockedCount,
    totalCount: ALL_ACHIEVEMENTS.length,
    totalVisibleCount,
    isGuest,
    isLoading: false,
    markSeen: () => markAllAchievementsSeen(isGuest),
  };
}
