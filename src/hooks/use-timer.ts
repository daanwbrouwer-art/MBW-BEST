import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Longest stretch with the app in the background (screen off between sets,
 * a quick look at another app) that still counts as training time. A longer
 * absence counts only this much: the user most likely left the workout.
 */
export const MAX_AWAY_MS = 5 * 60 * 1000;

/**
 * Counts training seconds while `running`, starting from `initialSeconds`
 * (used when a workout resumes after the app was closed).
 *
 * Measured by the wall clock, not by counting interval ticks: browsers
 * throttle timers in background tabs, which used to make the count drift.
 * Time with the page hidden counts up to MAX_AWAY_MS per absence.
 */
export function useTimer(running: boolean, initialSeconds = 0) {
  const [elapsed, setElapsed] = useState(initialSeconds);
  const msRef = useRef(initialSeconds * 1000);

  const reset = useCallback(() => {
    msRef.current = 0;
    setElapsed(0);
  }, []);

  useEffect(() => {
    if (!running) return;
    let last = Date.now();
    let hidden = document.visibilityState === "hidden";
    const advance = (cap: number) => {
      const now = Date.now();
      msRef.current += Math.min(Math.max(0, now - last), cap);
      last = now;
      setElapsed(Math.floor(msRef.current / 1000));
    };
    // While hidden, ticks don't add anything; the absence is added (capped)
    // when the page is visible again.
    const tick = () => {
      if (!hidden) advance(MAX_AWAY_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (!hidden) advance(MAX_AWAY_MS);
        hidden = true;
      } else if (hidden) {
        hidden = false;
        advance(MAX_AWAY_MS);
      }
    };
    const id = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      // Keep the part-second up to the pause/stop.
      if (!hidden) advance(MAX_AWAY_MS);
    };
  }, [running]);

  const formatted = formatTime(elapsed);

  return { elapsed, formatted, reset };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
