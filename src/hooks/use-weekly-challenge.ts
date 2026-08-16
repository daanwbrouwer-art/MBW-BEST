import {
  type ChallengeCelebrationInfo,
  computeChallengeProgress,
  consumePendingChallengeCelebration,
  getOrCreateWeeklyChallenge,
} from "@/lib/challenge";
import { getRecommendedDifficulty } from "@/lib/recommendation";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useStreak } from "@/hooks/use-streak";
import { useTier } from "@/hooks/use-tier";
import type { ChallengeProgress, WeeklyChallengeRecord } from "@/types/challenge";
import { useCallback, useState } from "react";

export function useWeeklyChallenge() {
  const { streak, isGuest } = useStreak();
  const { effectiveTier } = useTier();
  const { fitnessLevel, selfAssessment } = useOnboarding();

  const difficulty = getRecommendedDifficulty(fitnessLevel, selfAssessment);
  const challenge: WeeklyChallengeRecord = getOrCreateWeeklyChallenge(isGuest, {
    difficulty,
    isSubscriber: effectiveTier === "subscriber",
    currentStreakWeeks: streak.current,
  });
  const progress: ChallengeProgress = computeChallengeProgress(
    challenge,
    isGuest,
    streak,
  );

  const [celebration, setCelebration] = useState<ChallengeCelebrationInfo | null>(
    () => consumePendingChallengeCelebration(isGuest),
  );
  const dismissCelebration = useCallback(() => setCelebration(null), []);

  return { challenge, progress, isGuest, tier: effectiveTier, celebration, dismissCelebration };
}
