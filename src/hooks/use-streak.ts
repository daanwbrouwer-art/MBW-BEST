import {
  type CelebrationInfo,
  type EndedNudgeInfo,
  consumePendingCelebration,
  consumePendingEndedNudge,
  getMilestoneMessage,
  readStreak,
  setPendingCelebration,
  setPendingEndedNudge,
  setWeeklyGoal as setWeeklyGoalLib,
  syncStreak,
  writeStreak,
} from "@/lib/streak";
import { useWorkoutStore } from "@/store/workout";
import type { StreakData } from "@/types/streak";
import { useCallback, useState } from "react";

export function isCurrentlyGuest(): boolean {
  const isEmailAuth = localStorage.getItem("mbw_user") !== null;
  const guestMode = useWorkoutStore.getState().guestMode;
  return guestMode && !isEmailAuth;
}

interface StreakUiState {
  streak: StreakData;
  celebration: CelebrationInfo | null;
  endedNudge: EndedNudgeInfo | null;
}

function loadStreakUiState(isGuest: boolean): StreakUiState {
  const raw = readStreak(isGuest);
  const result = syncStreak(raw);
  if (JSON.stringify(result.data) !== JSON.stringify(raw)) {
    writeStreak(isGuest, result.data);
  }
  if (result.justHitWeeklyGoal) {
    setPendingCelebration(isGuest, {
      weeks: result.newStreakWeeks,
      message: getMilestoneMessage(result.newStreakWeeks),
    });
  }
  if (result.streakJustEnded) {
    setPendingEndedNudge(isGuest, {
      endedFromWeeks: result.endedFromWeeks,
      weeklyGoal: result.data.weeklyGoal,
    });
  }
  return {
    streak: result.data,
    celebration: consumePendingCelebration(isGuest),
    endedNudge: consumePendingEndedNudge(isGuest),
  };
}

/** Read + display hook for streak state — syncs on mount, consumes any pending celebration/ended-nudge event. Use on Home / My Streak / Profile. For recording a just-completed workout, call `recordCompletedWorkout` from `@/lib/streak` directly instead (no need for this hook's consume-on-mount behavior there). */
export function useStreak() {
  const guestMode = useWorkoutStore((s) => s.guestMode);
  const isEmailAuth = localStorage.getItem("mbw_user") !== null;
  const isGuest = guestMode && !isEmailAuth;

  const [state, setState] = useState<StreakUiState>(() =>
    loadStreakUiState(isGuest),
  );

  const dismissCelebration = useCallback(() => {
    setState((s) => ({ ...s, celebration: null }));
  }, []);

  const dismissEndedNudge = useCallback(() => {
    setState((s) => ({ ...s, endedNudge: null }));
  }, []);

  const updateWeeklyGoal = useCallback(
    (goal: number) => {
      const data = setWeeklyGoalLib(isGuest, goal);
      setState((s) => ({ ...s, streak: data }));
    },
    [isGuest],
  );

  return {
    streak: state.streak,
    celebration: state.celebration,
    endedNudge: state.endedNudge,
    dismissCelebration,
    dismissEndedNudge,
    setWeeklyGoal: updateWeeklyGoal,
    isGuest,
  };
}
