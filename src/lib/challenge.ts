// Weekly challenge engine. One challenge is generated per Mon-Sun week per
// guest/registered bucket, frozen at generation (type, target, and — for
// Endurance — which tier variant applies never change mid-week even if the
// user's difficulty or subscription status changes). Progress itself is
// always computed live from the same data sources the rest of the app
// already tracks (streak.ts, the achievement session log) — nothing
// progress-related is cached.
import { readSessions } from "@/lib/achievementSessionLog";
import { getCardsDrawnThisWeek } from "@/lib/streak";
import type { StreakData } from "@/types/streak";
import type {
  ChallengeHistoryEntry,
  ChallengeProgress,
  ChallengeType,
  WeeklyChallengeRecord,
} from "@/types/challenge";
import type { DeckDifficulty } from "@/types/workout";

const CHALLENGE_ROTATION: ChallengeType[] = [
  "card-volume",
  "consistency",
  "variety",
  "endurance",
  "streak",
];

// ─── Date helpers (local timezone, mirroring streak.ts) ────────────────────
// "Every Monday at 00:00 UTC (same reset as the card counter)" — the
// existing card counter (streak.ts's getCardsDrawnThisWeek) actually resets
// at local-timezone Monday, not UTC. Matching the card counter takes
// priority over the literal "UTC" wording — the whole point of tying the
// reset together is so the challenge and the weekly card limit move in
// lockstep; running them on two different clocks would desync them.

function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

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

const EPOCH_MONDAY = mondayOf(new Date(2024, 0, 1));

function weekNumberFor(monday: Date): number {
  return Math.round((monday.getTime() - EPOCH_MONDAY.getTime()) / (7 * 86_400_000));
}

// ─── Storage ────────────────────────────────────────────────────────────────

function storageKey(isGuest: boolean): string {
  return isGuest ? "mbw_challenge_guest" : "mbw_challenge_user";
}

// Only ever read/written for the registered/subscriber bucket — per spec,
// a guest's completion never persists anywhere, so there's no guest
// history key at all.
const HISTORY_KEY = "mbw_challenge_history_user";

function readRecord(isGuest: boolean): WeeklyChallengeRecord | null {
  try {
    const raw = localStorage.getItem(storageKey(isGuest));
    return raw ? (JSON.parse(raw) as WeeklyChallengeRecord) : null;
  } catch {
    return null;
  }
}

function writeRecord(isGuest: boolean, record: WeeklyChallengeRecord): void {
  localStorage.setItem(storageKey(isGuest), JSON.stringify(record));
}

export function readChallengeHistory(): ChallengeHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ChallengeHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function appendHistoryEntry(entry: ChallengeHistoryEntry): void {
  const history = readChallengeHistory();
  history.push(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// ─── Generation ─────────────────────────────────────────────────────────────

export interface GenerateChallengeInput {
  difficulty: DeckDifficulty;
  isSubscriber: boolean;
  /** streak.current — consecutive weeks the weekly training goal was met, per the streak system's weekly-goal model. */
  currentStreakWeeks: number;
}

const CARD_VOLUME_TARGET: Record<DeckDifficulty, number> = {
  Beginner: 30,
  Advanced: 50,
  Pro: 80,
};

const CONSISTENCY_TARGET: Record<DeckDifficulty, number> = {
  Beginner: 3,
  Advanced: 4,
  Pro: 5,
};

function computeStreakTarget(current: number): number {
  if (current <= 3) return 3;
  if (current <= 6) return 7;
  return current + 3;
}

function buildChallenge(
  type: ChallengeType,
  weekStart: string,
  weekNumber: number,
  input: GenerateChallengeInput,
): WeeklyChallengeRecord {
  const base = {
    type,
    weekStart,
    weekNumber,
    completedAt: null as string | null,
  };

  switch (type) {
    case "card-volume": {
      const target = CARD_VOLUME_TARGET[input.difficulty];
      return {
        ...base,
        target,
        unitLabel: "cards",
        description: `Draw ${target} cards this week`,
        isSubscriberVariant: false,
      };
    }
    case "consistency": {
      const target = CONSISTENCY_TARGET[input.difficulty];
      return {
        ...base,
        target,
        unitLabel: "days",
        description: `Train ${target} different days this week`,
        isSubscriberVariant: false,
      };
    }
    case "variety": {
      return {
        ...base,
        target: 2,
        unitLabel: "decks",
        description: "Try 2 different decks this week",
        isSubscriberVariant: false,
      };
    }
    case "endurance": {
      if (input.isSubscriber) {
        return {
          ...base,
          target: 1,
          unitLabel: "sessions",
          description: "Complete a Full Deck session (52 cards)",
          isSubscriberVariant: true,
        };
      }
      return {
        ...base,
        target: 2,
        unitLabel: "sessions",
        description: "Complete 2 sessions of 20 cards in one day",
        isSubscriberVariant: false,
      };
    }
    case "streak": {
      const target = computeStreakTarget(input.currentStreakWeeks);
      // The underlying mechanic is the weekly-goal streak system
      // (streak.current, counted in weeks) rather than a literal daily
      // streak — "week" in the copy stays truthful to what's measured.
      return {
        ...base,
        target,
        unitLabel: "weeks",
        description: `Maintain a ${target}-week streak`,
        isSubscriberVariant: false,
      };
    }
  }
}

/** Reads this week's challenge, generating (and freezing) a new one the first time it's read after a Monday rollover. */
export function getOrCreateWeeklyChallenge(
  isGuest: boolean,
  input: GenerateChallengeInput,
  now: Date = new Date(),
): WeeklyChallengeRecord {
  const monday = mondayOf(now);
  const weekStart = toISODate(monday);
  const existing = readRecord(isGuest);
  if (existing && existing.weekStart === weekStart) return existing;

  const weekNumber = weekNumberFor(monday);
  const rotationIndex =
    ((weekNumber % CHALLENGE_ROTATION.length) + CHALLENGE_ROTATION.length) %
    CHALLENGE_ROTATION.length;
  const type = CHALLENGE_ROTATION[rotationIndex]!;
  const record = buildChallenge(type, weekStart, weekNumber, input);
  writeRecord(isGuest, record);
  return record;
}

// ─── Progress ───────────────────────────────────────────────────────────────

function sessionsThisWeek(isGuest: boolean, weekStart: string) {
  const end = toISODate(addDays(parseISODate(weekStart), 6));
  return readSessions(isGuest).filter(
    (s) => s.dateKey >= weekStart && s.dateKey <= end,
  );
}

export function computeChallengeProgress(
  challenge: WeeklyChallengeRecord,
  isGuest: boolean,
  streak: StreakData,
): ChallengeProgress {
  const { target } = challenge;
  let current = 0;

  switch (challenge.type) {
    case "card-volume": {
      current = getCardsDrawnThisWeek(isGuest);
      break;
    }
    case "consistency": {
      current = streak.currentWeekTrainingDays;
      break;
    }
    case "variety": {
      const sessions = sessionsThisWeek(isGuest, challenge.weekStart);
      current = new Set(sessions.map((s) => s.deckCategory)).size;
      break;
    }
    case "endurance": {
      const sessions = sessionsThisWeek(isGuest, challenge.weekStart);
      if (challenge.isSubscriberVariant) {
        current = sessions.some((s) => s.isFullDeckSession) ? 1 : 0;
      } else {
        const byDay = new Map<string, number>();
        for (const s of sessions) {
          if (s.cardsDrawn >= 20) {
            byDay.set(s.dateKey, (byDay.get(s.dateKey) ?? 0) + 1);
          }
        }
        const bestDay = byDay.size > 0 ? Math.max(...byDay.values()) : 0;
        current = Math.min(2, bestDay);
      }
      break;
    }
    case "streak": {
      current = streak.current;
      break;
    }
  }

  const clamped = Math.max(0, Math.min(target, current));
  return {
    current: clamped,
    target,
    completed: current >= target,
    pct: target > 0 ? Math.min(100, (clamped / target) * 100) : 0,
  };
}

export function daysUntilReset(weekStart: string, now: Date = new Date()): number {
  const start = parseISODate(weekStart);
  const nextMonday = addDays(start, 7);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.ceil((nextMonday.getTime() - today.getTime()) / 86_400_000));
}

// ─── Completion processing ──────────────────────────────────────────────────

export type ChallengeTier = "guest" | "registered" | "subscriber";

export interface ChallengeCompletionResult {
  justCompleted: boolean;
  challenge: WeeklyChallengeRecord;
}

/**
 * Called after every completed session. Detects a fresh completion (progress
 * just crossed the target and the challenge wasn't already marked complete)
 * and applies the tier-specific reward: Subscribers get a real history log
 * entry; Registered and Guest never persist one (Registered still gets to
 * see "✅ Completed" for the rest of the week via `completedAt`, it just
 * doesn't survive into any history list).
 */
export function processWeeklyChallenge(
  isGuest: boolean,
  tier: ChallengeTier,
  input: GenerateChallengeInput,
  streak: StreakData,
  now: Date = new Date(),
): ChallengeCompletionResult {
  const challenge = getOrCreateWeeklyChallenge(isGuest, input, now);
  if (challenge.completedAt) {
    return { justCompleted: false, challenge };
  }

  const progress = computeChallengeProgress(challenge, isGuest, streak);
  if (!progress.completed) {
    return { justCompleted: false, challenge };
  }

  const completedAtIso = now.toISOString();
  const completed: WeeklyChallengeRecord = {
    ...challenge,
    completedAt: completedAtIso,
  };
  writeRecord(isGuest, completed);

  if (tier === "subscriber") {
    appendHistoryEntry({
      weekStart: completed.weekStart,
      type: completed.type,
      description: completed.description,
      completedAt: completedAtIso,
    });
  }

  return { justCompleted: true, challenge: completed };
}

// ─── Pending celebration relay ──────────────────────────────────────────────
// Same read-once-across-navigation pattern as streak.ts's celebration relay
// — a challenge completes wherever a session was just saved (WorkoutSummaryPage)
// but the celebration banner is shown on Home.

export interface ChallengeCelebrationInfo {
  description: string;
  tier: ChallengeTier;
}

function celebrationKey(isGuest: boolean): string {
  return `mbw_challenge_celebration_${isGuest ? "guest" : "user"}`;
}

export function setPendingChallengeCelebration(
  isGuest: boolean,
  info: ChallengeCelebrationInfo,
): void {
  localStorage.setItem(celebrationKey(isGuest), JSON.stringify(info));
}

export function consumePendingChallengeCelebration(
  isGuest: boolean,
): ChallengeCelebrationInfo | null {
  const key = celebrationKey(isGuest);
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  localStorage.removeItem(key);
  try {
    return JSON.parse(raw) as ChallengeCelebrationInfo;
  } catch {
    return null;
  }
}

// ─── Migration (guest -> registered, on sign-up) ───────────────────────────

export function migrateGuestChallenge(): void {
  const raw = localStorage.getItem(storageKey(true));
  if (raw && !localStorage.getItem(storageKey(false))) {
    localStorage.setItem(storageKey(false), raw);
  }
  if (raw) localStorage.removeItem(storageKey(true));
}
