// Parallel, localStorage-backed log of per-session facts the achievement
// engine needs but that the backend's WorkoutHistoryEntry doesn't carry
// (deck category/difficulty, special-card breakdowns, equipment used,
// timing). Mirrors the guest/registered split already used by
// src/lib/streak.ts, so achievement progress works for guests too — not
// just accounts with a backend profile.
import { computeAvgTimePerCard, isSessionValid } from "@/lib/timeValidation";

const GUEST_KEY = "mbw_achv_sessions_guest";
const USER_KEY = "mbw_achv_sessions_user";
const FIRST_CARD_GUEST_KEY = "mbw_achv_first_card_guest";
const FIRST_CARD_USER_KEY = "mbw_achv_first_card_user";
const APP_OPENS_GUEST_KEY = "mbw_achv_app_opens_guest";
const APP_OPENS_USER_KEY = "mbw_achv_app_opens_user";

const MAX_SESSIONS_KEPT = 1000;

export interface EquipmentSnapshot {
  weightVest: boolean;
  resistanceBandLong: boolean;
  resistanceBandShort: boolean;
  rings: boolean;
}

export interface PlayedCardFact {
  rank: string;
  suit: string;
  exercise: string;
  reps: number;
}

export interface AchievementSessionRecord {
  id: string;
  completedAt: number;
  startedAt: number;
  durationSeconds: number;
  cardsDrawn: number;
  totalCardsInSession: number;
  isValid: boolean;
  avgTimePerCard: number;
  deckCategory: string;
  deckDifficulty: string;
  deckGender: "male" | "female";
  deckKey: string;
  isFullDeckSession: boolean;
  totalReps: number;
  kingCount: number;
  aceCount: number;
  jokerCount: number;
  queenCount: number;
  jackCount: number;
  twoOfSpadesCount: number;
  uniqueExerciseCount: number;
  uniqueExerciseNames: string[];
  hasRoyalFlush: boolean;
  hasMirrorImage: boolean;
  hasConsecutiveDuplicate: boolean;
  equipmentSnapshot: EquipmentSnapshot;
  usedProDeck: boolean;
  /** Always 0 — this build has no skip-a-card mechanic during a session. */
  skipsCount: number;
  dateKey: string;
  dayOfWeek: number;
  hour: number;
}

function storageKey(isGuest: boolean): string {
  return isGuest ? GUEST_KEY : USER_KEY;
}

export function readSessions(isGuest: boolean): AchievementSessionRecord[] {
  try {
    const raw = localStorage.getItem(storageKey(isGuest));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSessions(
  isGuest: boolean,
  sessions: AchievementSessionRecord[],
): void {
  localStorage.setItem(
    storageKey(isGuest),
    JSON.stringify(sessions.slice(-MAX_SESSIONS_KEPT)),
  );
}

function localDateKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildSessionRecord(params: {
  id: string;
  completedAt: number;
  durationSeconds: number;
  totalCardsInSession: number;
  deckCategory: string;
  deckDifficulty: string;
  deckGender: "male" | "female";
  playedCards: PlayedCardFact[];
  equipmentSnapshot: EquipmentSnapshot;
}): AchievementSessionRecord {
  const {
    id,
    completedAt,
    durationSeconds,
    totalCardsInSession,
    deckCategory,
    deckDifficulty,
    deckGender,
    playedCards,
    equipmentSnapshot,
  } = params;
  const cardsDrawn = playedCards.length;
  const startedAt = completedAt - durationSeconds * 1000;

  let totalReps = 0;
  let kingCount = 0;
  let aceCount = 0;
  let jokerCount = 0;
  let queenCount = 0;
  let jackCount = 0;
  let twoOfSpadesCount = 0;
  const exerciseSet = new Set<string>();
  const rankSuits: Record<string, Set<string>> = {};
  let hasConsecutiveDuplicate = false;

  playedCards.forEach((pc, i) => {
    totalReps += pc.reps ?? 0;
    if (pc.exercise) exerciseSet.add(pc.exercise);
    if (pc.rank === "King") kingCount++;
    if (pc.rank === "Ace") aceCount++;
    if (pc.rank === "Joker") jokerCount++;
    if (pc.rank === "Queen") queenCount++;
    if (pc.rank === "Jack") jackCount++;
    if (pc.rank === "Two" && pc.suit === "Spades") twoOfSpadesCount++;

    if (pc.rank !== "Joker") {
      if (!rankSuits[pc.rank]) rankSuits[pc.rank] = new Set();
      rankSuits[pc.rank]!.add(pc.suit);
    }

    if (i > 0) {
      const prev = playedCards[i - 1]!;
      if (prev.rank === pc.rank && prev.suit === pc.suit) {
        hasConsecutiveDuplicate = true;
      }
    }
  });

  const hasRoyalFlush =
    kingCount > 0 && queenCount > 0 && jackCount > 0 && aceCount > 0 && jokerCount > 0;
  const hasMirrorImage = Object.values(rankSuits).some((suits) => suits.size >= 4);
  const isFullDeckSession = totalCardsInSession >= 52 && cardsDrawn >= 52;
  const startDate = new Date(startedAt);

  return {
    id,
    completedAt,
    startedAt,
    durationSeconds,
    cardsDrawn,
    totalCardsInSession,
    isValid: isSessionValid(durationSeconds, cardsDrawn),
    avgTimePerCard: computeAvgTimePerCard(durationSeconds, cardsDrawn),
    deckCategory,
    deckDifficulty,
    deckGender,
    deckKey: `${deckCategory}-${deckDifficulty}-${deckGender}`,
    isFullDeckSession,
    totalReps,
    kingCount,
    aceCount,
    jokerCount,
    queenCount,
    jackCount,
    twoOfSpadesCount,
    uniqueExerciseCount: exerciseSet.size,
    uniqueExerciseNames: [...exerciseSet],
    hasRoyalFlush,
    hasMirrorImage,
    hasConsecutiveDuplicate,
    equipmentSnapshot,
    usedProDeck: deckDifficulty === "Pro",
    skipsCount: 0,
    dateKey: localDateKey(startedAt),
    dayOfWeek: startDate.getDay(),
    hour: startDate.getHours(),
  };
}

export function recordSession(
  isGuest: boolean,
  record: AchievementSessionRecord,
): AchievementSessionRecord[] {
  const sessions = readSessions(isGuest);
  sessions.push(record);
  writeSessions(isGuest, sessions);
  return sessions;
}

// ─── First card ever drawn (sc_09 "Lucky Number") ──────────────────────────

export interface FirstCardFact {
  rank: string;
  suit: string;
}

function firstCardKey(isGuest: boolean): string {
  return isGuest ? FIRST_CARD_GUEST_KEY : FIRST_CARD_USER_KEY;
}

/** Idempotent — only the very first call for a given bucket ever sticks. */
export function setFirstCardEverIfUnset(
  isGuest: boolean,
  card: FirstCardFact,
): void {
  const key = firstCardKey(isGuest);
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, JSON.stringify(card));
}

export function getFirstCardEver(isGuest: boolean): FirstCardFact | null {
  try {
    const raw = localStorage.getItem(firstCardKey(isGuest));
    return raw ? (JSON.parse(raw) as FirstCardFact) : null;
  } catch {
    return null;
  }
}

// ─── App-open log (st_08 "Ghost") ──────────────────────────────────────────
// Rolling list of local YYYY-MM-DD dates the app was opened on, deduped per
// day, checked against session dates to find a run of opened-but-idle days.

function appOpensKey(isGuest: boolean): string {
  return isGuest ? APP_OPENS_GUEST_KEY : APP_OPENS_USER_KEY;
}

export function recordAppOpen(isGuest: boolean): void {
  const key = appOpensKey(isGuest);
  let opens: string[] = [];
  try {
    const raw = localStorage.getItem(key);
    opens = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    opens = [];
  }
  const today = localDateKey(Date.now());
  if (!opens.includes(today)) opens.push(today);
  localStorage.setItem(key, JSON.stringify(opens.slice(-30)));
}

export function readAppOpens(isGuest: boolean): string[] {
  try {
    const raw = localStorage.getItem(appOpensKey(isGuest));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

// ─── Patience flag (tb_11 "Patience") ───────────────────────────────────────
// Set directly by WorkoutSetupPage when the user lingers on the pre-workout
// screen for 60s without pressing Start — not derived from a session record,
// since by definition no session happens.

const PATIENCE_GUEST_KEY = "mbw_achv_patience_guest";
const PATIENCE_USER_KEY = "mbw_achv_patience_user";

function patienceKey(isGuest: boolean): string {
  return isGuest ? PATIENCE_GUEST_KEY : PATIENCE_USER_KEY;
}

export function setPatienceFlag(isGuest: boolean): void {
  localStorage.setItem(patienceKey(isGuest), "1");
}

export function getPatienceFlag(isGuest: boolean): boolean {
  return localStorage.getItem(patienceKey(isGuest)) === "1";
}

// ─── Migration (guest -> registered, on sign-up) ───────────────────────────

export function migrateGuestAchievementData(): void {
  const moves: [string, string][] = [
    [GUEST_KEY, USER_KEY],
    [FIRST_CARD_GUEST_KEY, FIRST_CARD_USER_KEY],
    [APP_OPENS_GUEST_KEY, APP_OPENS_USER_KEY],
    [PATIENCE_GUEST_KEY, PATIENCE_USER_KEY],
  ];
  for (const [from, to] of moves) {
    const raw = localStorage.getItem(from);
    if (raw && !localStorage.getItem(to)) {
      localStorage.setItem(to, raw);
    }
    if (raw) localStorage.removeItem(from);
  }
}
