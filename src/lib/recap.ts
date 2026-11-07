// Monthly Recap and Year in Review, computed from the workout log kept on
// the phone (achievementSessionLog — every finished workout, including
// custom decks and guest workouts).
import type { AchievementSessionRecord } from "@/lib/achievementSessionLog";

export type RecapPeriod =
  | { kind: "month"; year: number; month: number } // month: 0-11
  | { kind: "year"; year: number };

export interface RecapStats {
  workouts: number;
  trainingDays: number;
  cards: number;
  reps: number;
  minutes: number;
  calories: number;
  achievements: number;
  /** Most consecutive calendar days trained within the period. */
  longestDayRun: number;
  topDeck: string | null;
  topExercises: { name: string; sessions: number }[];
  busiestWeekday: string | null;
  favoriteTime: string | null;
  /** Workouts in the previous month/year, for the "vs last" line. */
  previousWorkouts: number;
  // Year in Review extras
  perMonth: number[];
  bestMonth: string | null;
  exercisesTried: number;
  proSessions: number;
  fullDeckSessions: number;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DECK_LABEL: Record<string, string> = {
  UpperBody: "Upper Body",
  LowerBody: "Lower Body",
  Core: "Core",
  FullBody: "Full Body",
  Custom: "Custom decks",
};

export function periodLabel(p: RecapPeriod): string {
  return p.kind === "month" ? `${MONTH_NAMES[p.month]} ${p.year}` : `${p.year}`;
}

function inPeriod(t: number, p: RecapPeriod): boolean {
  const d = new Date(t);
  return p.kind === "month"
    ? d.getFullYear() === p.year && d.getMonth() === p.month
    : d.getFullYear() === p.year;
}

export function previousPeriod(p: RecapPeriod): RecapPeriod {
  if (p.kind === "year") return { kind: "year", year: p.year - 1 };
  return p.month === 0
    ? { kind: "month", year: p.year - 1, month: 11 }
    : { kind: "month", year: p.year, month: p.month - 1 };
}

export function nextPeriod(p: RecapPeriod): RecapPeriod {
  if (p.kind === "year") return { kind: "year", year: p.year + 1 };
  return p.month === 11
    ? { kind: "month", year: p.year + 1, month: 0 }
    : { kind: "month", year: p.year, month: p.month + 1 };
}

export function currentPeriod(kind: "month" | "year", now = new Date()): RecapPeriod {
  return kind === "month"
    ? { kind, year: now.getFullYear(), month: now.getMonth() }
    : { kind, year: now.getFullYear() };
}

/** True while the period hasn't ended yet ("so far"). */
export function isPeriodInProgress(p: RecapPeriod, now = new Date()): boolean {
  return inPeriod(now.getTime(), p);
}

function mostCommon(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  let n = 0;
  for (const [v, c] of counts) if (c > n) [best, n] = [v, c];
  return best;
}

function timeOfDay(hour: number): string {
  if (hour < 5) return "Night owl";
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  if (hour < 21) return "Evening";
  return "Night owl";
}

function longestRun(dateKeys: string[]): number {
  const days = [...new Set(dateKeys)]
    .map((k) => {
      const [y, m, d] = k.split("-").map(Number);
      return Date.UTC(y!, (m ?? 1) - 1, d ?? 1) / 86_400_000;
    })
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i]! - days[i - 1]! === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

export function computeRecap(
  allSessions: AchievementSessionRecord[],
  unlockTimes: number[],
  p: RecapPeriod,
): RecapStats {
  const sessions = allSessions.filter((s) => inPeriod(s.completedAt, p));
  const prev = previousPeriod(p);

  const exerciseSessions = new Map<string, number>();
  for (const s of sessions)
    for (const name of s.uniqueExerciseNames ?? [])
      // Joker cards are challenges, not exercises.
      if (name && !/joker|combo/i.test(name))
        exerciseSessions.set(name, (exerciseSessions.get(name) ?? 0) + 1);
  const topExercises = [...exerciseSessions]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, n]) => ({ name, sessions: n }));

  const perMonth = new Array(12).fill(0) as number[];
  if (p.kind === "year")
    for (const s of sessions) perMonth[new Date(s.completedAt).getMonth()]!++;
  const peak = Math.max(...perMonth);

  const deck = mostCommon(sessions.map((s) => s.deckCategory));
  const weekday = mostCommon(sessions.map((s) => String(new Date(s.completedAt).getDay())));

  return {
    workouts: sessions.length,
    trainingDays: new Set(sessions.map((s) => s.dateKey)).size,
    cards: sessions.reduce((a, s) => a + s.cardsDrawn, 0),
    reps: sessions.reduce((a, s) => a + s.totalReps, 0),
    minutes: Math.round(sessions.reduce((a, s) => a + s.durationSeconds, 0) / 60),
    calories: Math.round(sessions.reduce((a, s) => a + (s.caloriesBurned ?? 0), 0)),
    achievements: unlockTimes.filter((t) => inPeriod(t, p)).length,
    longestDayRun: longestRun(sessions.map((s) => s.dateKey)),
    topDeck: deck ? (DECK_LABEL[deck] ?? deck) : null,
    topExercises,
    busiestWeekday: weekday === null ? null : WEEKDAYS[Number(weekday)]!,
    favoriteTime: mostCommon(sessions.map((s) => timeOfDay(new Date(s.completedAt).getHours()))),
    previousWorkouts: allSessions.filter((s) => inPeriod(s.completedAt, prev)).length,
    perMonth,
    bestMonth: peak > 0 ? MONTH_NAMES[perMonth.indexOf(peak)]! : null,
    exercisesTried: exerciseSessions.size,
    proSessions: sessions.filter((s) => s.deckDifficulty === "Pro").length,
    fullDeckSessions: sessions.filter((s) => s.isFullDeckSession).length,
  };
}
