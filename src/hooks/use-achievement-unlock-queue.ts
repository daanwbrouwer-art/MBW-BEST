import type { Achievement } from "@/types/achievements";
import { useCallback, useRef, useState } from "react";

/** Plays queued achievement-unlock animations one at a time, with a 0.5s gap between each (Prompt 15, Part 2). */
export function useAchievementUnlockQueue() {
  const [current, setCurrent] = useState<Achievement | null>(null);
  const queueRef = useRef<Achievement[]>([]);

  const enqueue = useCallback((achievements: Achievement[]) => {
    if (achievements.length === 0) return;
    queueRef.current.push(...achievements);
    setCurrent((playing) => {
      if (playing) return playing;
      return queueRef.current.shift() ?? null;
    });
  }, []);

  const handleComplete = useCallback(() => {
    setTimeout(() => {
      setCurrent(queueRef.current.shift() ?? null);
    }, 500);
  }, []);

  return { current, enqueue, handleComplete };
}
