import type {
  BestExercise,
  StreakData,
  StreakDayEntry,
  StreakExerciseEntry,
} from "@/types/streak";

// ─── Storage ────────────────────────────────────────────────────────────────
// Two flat, device-level buckets (guest vs. the currently logged-in user) —
// the same non-per-account pattern already used for onboarding data
// (mbw_guest_onboarding / mbw_onboarding). Streaks must work for guests too
// (per spec, guest streak history migrates on registration), and this app
// has no real multi-account server, so this mirrors the existing precedent.
const GUEST_KEY = "mbw_streak_guest";
const USER_KEY = "mbw_streak_user";

const CELEBRATION_KEY_PREFIX = "mbw_streak_celebration_";
const NUDGE_KEY_PREFIX = "mbw_streak_nudge_";

function bucketKey(isGuest: boolean): string {
  return isGuest ? GUEST_KEY : USER_KEY;
}

function relayKey(prefix: string, isGuest: boolean): string {
  return `${prefix}${isGuest ? "guest" : "user"}`;
}

function defaultStreak(): StreakData {
  return {
    weeklyGoal: 3,
    currentWeekTrainingDays: 0,
    current: 0,
    longest: 0,
    lastTrainingDate: null,
    totalTrainingDaysThisYear: 0,
    totalTrainingDaysYear: new Date().getFullYear(),
    bestExercise: null,
    history: [],
    lastProcessedWeekStart: null,
  };
}

export function readStreak(isGuest: boolean): StreakData {
  try {
    const raw = localStorage.getItem(bucketKey(isGuest));
    if (!raw) return defaultStreak();
    return { ...defaultStreak(), ...JSON.parse(raw) };
  } catch {
    return defaultStreak();
  }
}

export function writeStreak(isGuest: boolean, data: StreakData): void {
  localStorage.setItem(bucketKey(isGuest), JSON.stringify(data));
}

// ─── Pending event relay ────────────────────────────────────────────────────
// The event that hits the weekly goal (or discovers a broken streak) is
// detected wherever a sync happens to run first — often WorkoutSummaryPage,
// right after a session completes — but must be *displayed* on the Home
// screen. These read-once localStorage flags relay that "just happened"
// event across the page navigation.

export interface CelebrationInfo {
  weeks: number;
  message: string;
}

export interface EndedNudgeInfo {
  endedFromWeeks: number;
  weeklyGoal: number;
}

export function setPendingCelebration(
  isGuest: boolean,
  info: CelebrationInfo,
): void {
  localStorage.setItem(
    relayKey(CELEBRATION_KEY_PREFIX, isGuest),
    JSON.stringify(info),
  );
}

export function consumePendingCelebration(
  isGuest: boolean,
): CelebrationInfo | null {
  const key = relayKey(CELEBRATION_KEY_PREFIX, isGuest);
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  localStorage.removeItem(key);
  try {
    return JSON.parse(raw) as CelebrationInfo;
  } catch {
    return null;
  }
}

export function setPendingEndedNudge(
  isGuest: boolean,
  info: EndedNudgeInfo,
): void {
  localStorage.setItem(
    relayKey(NUDGE_KEY_PREFIX, isGuest),
    JSON.stringify(info),
  );
}

export function consumePendingEndedNudge(
  isGuest: boolean,
): EndedNudgeInfo | null {
  const key = relayKey(NUDGE_KEY_PREFIX, isGuest);
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  localStorage.removeItem(key);
  try {
    return JSON.parse(raw) as EndedNudgeInfo;
  } catch {
    return null;
  }
}

// ─── Date helpers (local timezone throughout) ──────────────────────────────

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Monday of the Mon-Sun week containing `date`, as a Date at local midnight. */
function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sun .. 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function mondayOfISO(dateISO: string): string {
  return toISODate(mondayOf(parseISODate(dateISO)));
}

/** Timezone-safe formatter for the YYYY-MM-DD strings used throughout this module. */
export function formatDateLabel(
  iso: string,
  opts: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  },
): string {
  return parseISODate(iso).toLocaleDateString("en-US", opts);
}

function countQualifyingDays(
  history: StreakDayEntry[],
  weekStartISO: string,
): number {
  const start = parseISODate(weekStartISO);
  const end = addDays(start, 6);
  return history.filter((h) => {
    const d = parseISODate(h.date);
    return d >= start && d <= end;
  }).length;
}

/** Total cards drawn across the Mon-Sun week containing `now` — the weekly card-limit counter. */
export function getCardsDrawnThisWeek(
  isGuest: boolean,
  now: Date = new Date(),
): number {
  const data = readStreak(isGuest);
  const weekStart = toISODate(mondayOf(now));
  const start = parseISODate(weekStart);
  const end = addDays(start, 6);
  return data.history.reduce((sum, h) => {
    const d = parseISODate(h.date);
    return d >= start && d <= end ? sum + h.cardsDrawn : sum;
  }, 0);
}

// ─── Milestones ─────────────────────────────────────────────────────────────

const MILESTONE_MESSAGES: Record<number, string> = {
  1: "First week goal hit! 🔥",
  4: "One month of consistency! 💪",
  8: "Two months strong!",
  12: "A full quarter — this is a lifestyle now.",
  26: "Half a year. Legend status.",
  52: "One full year. Unstoppable. 🏆",
};

export const MILESTONE_WEEKS = new Set(
  Object.keys(MILESTONE_MESSAGES).map(Number),
);

export function getMilestoneMessage(weeks: number): string {
  return (
    MILESTONE_MESSAGES[weeks] ?? `Week goal hit! 🔥 ${weeks}-week streak`
  );
}

// ─── Weekly rollover / sync ─────────────────────────────────────────────────

export interface SyncResult {
  data: StreakData;
  justHitWeeklyGoal: boolean;
  newStreakWeeks: number;
  streakJustEnded: boolean;
  endedFromWeeks: number;
}

/**
 * Brings a streak up to date against "now": walks forward through every
 * fully-elapsed week since the last processed one (deciding pass/fail for
 * each), then checks whether the still-in-progress current week has already
 * met the goal (banking it early — the moment the Nth qualifying day lands
 * — so the celebration fires immediately rather than waiting for Sunday).
 * Idempotent: calling this repeatedly with no new data is a no-op.
 */
export function syncStreak(data: StreakData, today: Date = new Date()): SyncResult {
  const d: StreakData = { ...data };
  let justHitWeeklyGoal = false;
  let newStreakWeeks = 0;
  let streakJustEnded = false;
  let endedFromWeeks = 0;

  const todayWeekStart = toISODate(mondayOf(today));

  if (d.lastProcessedWeekStart === null && d.history.length > 0) {
    const earliest = d.history.reduce(
      (min, h) => (h.date < min ? h.date : min),
      d.history[0].date,
    );
    const earliestWeekStart = mondayOfISO(earliest);
    d.lastProcessedWeekStart = toISODate(
      addDays(parseISODate(earliestWeekStart), -7),
    );
  }

  if (d.lastProcessedWeekStart !== null) {
    let cursor = d.lastProcessedWeekStart;
    // Safety cap so a corrupted cursor can never spin the loop forever.
    let guard = 0;
    while (guard++ < 10_000) {
      const next = toISODate(addDays(parseISODate(cursor), 7));
      if (next >= todayWeekStart) break;
      const trained = countQualifyingDays(d.history, next);
      if (trained >= d.weeklyGoal) {
        d.current += 1;
        d.longest = Math.max(d.longest, d.current);
      } else if (d.current > 0) {
        streakJustEnded = true;
        endedFromWeeks = d.current;
        d.current = 0;
      } else {
        d.current = 0;
      }
      cursor = next;
    }
    d.lastProcessedWeekStart = cursor;
  }

  d.currentWeekTrainingDays = countQualifyingDays(d.history, todayWeekStart);
  if (
    d.currentWeekTrainingDays >= d.weeklyGoal &&
    d.lastProcessedWeekStart !== todayWeekStart
  ) {
    d.current += 1;
    d.longest = Math.max(d.longest, d.current);
    d.lastProcessedWeekStart = todayWeekStart;
    justHitWeeklyGoal = true;
    newStreakWeeks = d.current;
  }

  return { data: d, justHitWeeklyGoal, newStreakWeeks, streakJustEnded, endedFromWeeks };
}

// ─── Recording a completed workout ─────────────────────────────────────────

export interface RecordSessionInput {
  cardsDrawn: number;
  deckUsed: string;
  exercises: StreakExerciseEntry[];
  date?: Date;
}

function applyBestExercise(
  best: BestExercise | null,
  exercises: StreakExerciseEntry[],
  dateISO: string,
): BestExercise | null {
  let next = best;
  for (const ex of exercises) {
    if (!ex.name || !(ex.reps > 0)) continue;
    if (!next || ex.reps > next.reps) {
      next = { name: ex.name, reps: ex.reps, dateAchieved: dateISO };
    }
  }
  return next;
}

/** Records one completed training day (a session with >=1 card drawn and finished) and re-syncs the streak. */
export function recordTrainingDay(
  isGuest: boolean,
  input: RecordSessionInput,
): SyncResult {
  const today = input.date ?? new Date();
  const dateISO = toISODate(today);
  const data = readStreak(isGuest);

  const year = today.getFullYear();
  if (data.totalTrainingDaysYear !== year) {
    data.totalTrainingDaysYear = year;
    data.totalTrainingDaysThisYear = 0;
  }

  const existingDay = data.history.find((h) => h.date === dateISO);
  if (existingDay) {
    existingDay.cardsDrawn += input.cardsDrawn;
    existingDay.deckUsed = input.deckUsed;
    existingDay.exercises = [...existingDay.exercises, ...input.exercises];
  } else {
    data.history.push({
      date: dateISO,
      cardsDrawn: input.cardsDrawn,
      deckUsed: input.deckUsed,
      exercises: [...input.exercises],
    });
    data.totalTrainingDaysThisYear += 1;
  }

  data.bestExercise = applyBestExercise(
    data.bestExercise,
    input.exercises,
    dateISO,
  );
  data.lastTrainingDate = dateISO;

  const result = syncStreak(data, today);
  writeStreak(isGuest, result.data);
  return result;
}

/** Convenience wrapper for call sites (e.g. WorkoutSummaryPage) that just need to fire-and-forget a completed session and stash any resulting celebration/nudge for Home to pick up. */
export function recordCompletedWorkout(
  isGuest: boolean,
  input: RecordSessionInput,
): SyncResult {
  const result = recordTrainingDay(isGuest, input);
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
  return result;
}

export function setWeeklyGoal(isGuest: boolean, goal: number): StreakData {
  const data = readStreak(isGuest);
  data.weeklyGoal = Math.min(7, Math.max(1, Math.round(goal)));
  writeStreak(isGuest, data);
  return data;
}

// ─── Derived views for the "My Streak" page ────────────────────────────────

export interface WeeklyLogEntry {
  weekStart: string;
  daysTrained: number;
  goalMet: boolean;
  streakAtWeek: number;
  isMilestone: boolean;
}

/** One row per week from the user's first-ever training week through the current week, most recent first. */
export function deriveWeeklyLog(data: StreakData): WeeklyLogEntry[] {
  if (data.history.length === 0) return [];
  const earliest = data.history.reduce(
    (min, h) => (h.date < min ? h.date : min),
    data.history[0].date,
  );
  let cursor = mondayOfISO(earliest);
  const todayWeekStart = toISODate(mondayOf(new Date()));
  const log: WeeklyLogEntry[] = [];
  let running = 0;
  let guard = 0;
  while (cursor <= todayWeekStart && guard++ < 10_000) {
    const trained = countQualifyingDays(data.history, cursor);
    const goalMet = trained >= data.weeklyGoal;
    running = goalMet ? running + 1 : 0;
    log.push({
      weekStart: cursor,
      daysTrained: trained,
      goalMet,
      streakAtWeek: running,
      isMilestone: goalMet && MILESTONE_WEEKS.has(running),
    });
    cursor = toISODate(addDays(parseISODate(cursor), 7));
  }
  return log.reverse();
}

export interface CalendarDay {
  date: string;
  inMonth: boolean;
  trained: boolean;
  intensity: "none" | "light" | "full";
}

/** Full calendar grid (including leading/trailing days from neighboring months to fill whole weeks) for a given month, Monday-first. */
export function getMonthCalendar(
  year: number,
  monthIndex: number,
  history: StreakDayEntry[],
): CalendarDay[] {
  const byDate = new Map(history.map((h) => [h.date, h]));
  const firstOfMonth = new Date(year, monthIndex, 1);
  const gridStart = mondayOf(firstOfMonth);
  const lastOfMonth = new Date(year, monthIndex + 1, 0);
  const gridEnd = (() => {
    const day = lastOfMonth.getDay();
    const trailing = day === 0 ? 0 : 7 - day;
    return addDays(lastOfMonth, trailing);
  })();

  const days: CalendarDay[] = [];
  let cursor = gridStart;
  let guard = 0;
  while (cursor <= gridEnd && guard++ < 60) {
    const iso = toISODate(cursor);
    const entry = byDate.get(iso);
    days.push({
      date: iso,
      inMonth: cursor.getMonth() === monthIndex,
      trained: !!entry,
      // Simple heuristic: a fuller session (more cards drawn) reads as a
      // "longer" workout — there's no persisted duration per day.
      intensity: !entry ? "none" : entry.cardsDrawn >= 15 ? "full" : "light",
    });
    cursor = addDays(cursor, 1);
  }
  return days;
}
