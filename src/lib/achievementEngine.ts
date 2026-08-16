// Achievement progress + unlock engine (Prompt 15). All progress is
// computed live from real tracked data every time it's needed — nothing
// numeric is cached. The only thing persisted is *claim* state (has this
// achievement actually been granted, and has the user seen it), stored per
// guest/registered bucket exactly like streak/trial/subscription data.
import {
  type AchievementSessionRecord,
  type FirstCardFact,
  getFirstCardEver,
  getPatienceFlag,
  readAppOpens,
  readSessions,
} from "@/lib/achievementSessionLog";
import {
  countReferredUsersWithSessions,
  getCurrentEmail,
  getReferralRecord,
  type ReferralRecord,
} from "@/lib/referral";
import {
  ALL_ACHIEVEMENTS,
  type Achievement,
  type AchievementMetric,
} from "@/types/achievements";
import type { StreakData, StreakDayEntry } from "@/types/streak";

// ─── Context ────────────────────────────────────────────────────────────

export interface AchievementContext {
  isGuest: boolean;
  streak: StreakData;
  /** Every recorded session, valid or not (some metrics — Ghost, skips — care about raw activity). */
  sessions: AchievementSessionRecord[];
  /** Only sessions that passed time validation, chronologically ascending. All progress-bearing metrics use this. */
  validSessions: AchievementSessionRecord[];
  firstCardEver: FirstCardFact | null;
  appOpens: string[];
  referral: ReferralRecord | null;
  referredActiveFriends: number;
}

export function buildAchievementContext(
  isGuest: boolean,
  streak: StreakData,
): AchievementContext {
  const sessions = readSessions(isGuest);
  const validSessions = sessions
    .filter((s) => s.isValid)
    .sort((a, b) => a.completedAt - b.completedAt);
  const firstCardEver = getFirstCardEver(isGuest);
  const appOpens = readAppOpens(isGuest);

  let referral: ReferralRecord | null = null;
  let referredActiveFriends = 0;
  if (!isGuest) {
    const email = getCurrentEmail();
    if (email) {
      referral = getReferralRecord(email);
      referredActiveFriends = countReferredUsersWithSessions(email);
    }
  }

  return {
    isGuest,
    streak,
    sessions,
    validSessions,
    firstCardEver,
    appOpens,
    referral,
    referredActiveFriends,
  };
}

// ─── Derived-stat helpers ───────────────────────────────────────────────

function sumBy(
  sessions: AchievementSessionRecord[],
  pick: (s: AchievementSessionRecord) => number,
): number {
  return sessions.reduce((sum, s) => sum + pick(s), 0);
}

/** Longest run of consecutive calendar days trained, from the streak system's per-day history. */
export function computeLongestDayStreak(history: StreakDayEntry[]): number {
  if (history.length === 0) return 0;
  const dates = [...new Set(history.map((h) => h.date))].sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < dates.length; i++) {
    const diffDays = Math.round(
      (new Date(dates[i]!).getTime() - new Date(dates[i - 1]!).getTime()) /
        86_400_000,
    );
    if (diffDays === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else if (diffDays > 1) {
      current = 1;
    }
  }
  return longest;
}

function isMonthDay(dateKey: string, month: number, day: number): boolean {
  const parts = dateKey.split("-").map(Number);
  return parts[1] === month && parts[2] === day;
}

/** Longest run of consecutive calendar days with an identical deck+card-count signature (st_07 "Groundhog Day"). */
function computeIdenticalSessionDayStreak(
  sessions: AchievementSessionRecord[],
): number {
  const byDate = new Map<string, string>();
  for (const s of sessions) {
    byDate.set(s.dateKey, `${s.deckKey}|${s.totalCardsInSession}`);
  }
  const dates = [...byDate.keys()].sort();
  if (dates.length === 0) return 0;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < dates.length; i++) {
    const diffDays = Math.round(
      (new Date(dates[i]!).getTime() - new Date(dates[i - 1]!).getTime()) /
        86_400_000,
    );
    if (diffDays === 1 && byDate.get(dates[i]!) === byDate.get(dates[i - 1]!)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

/** Longest run of consecutive Mondays (exactly 7 days apart) with a session (tb_07 "Monday Motivation"). */
function computeConsecutiveMondayWeeks(
  sessions: AchievementSessionRecord[],
): number {
  const mondayDates = [
    ...new Set(sessions.filter((s) => s.dayOfWeek === 1).map((s) => s.dateKey)),
  ].sort();
  if (mondayDates.length === 0) return 0;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < mondayDates.length; i++) {
    const diffDays = Math.round(
      (new Date(mondayDates[i]!).getTime() -
        new Date(mondayDates[i - 1]!).getTime()) /
        86_400_000,
    );
    if (diffDays === 7) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

/** Longest run of back-to-back sessions (by completion order, not calendar day) using the exact same deck (eq_06 "Creature of Habit"). */
function computeConsecutiveSameDeckCount(
  sessions: AchievementSessionRecord[],
): number {
  let longest = 0;
  let current = 0;
  let lastKey: string | null = null;
  for (const s of sessions) {
    if (s.deckKey === lastKey) {
      current += 1;
    } else {
      current = 1;
      lastKey = s.deckKey;
    }
    longest = Math.max(longest, current);
  }
  return longest;
}

/** True if any two consecutive valid sessions are 30+ days apart (sm_08 "Comeback Kid"). */
function hasComebackGap(sessions: AchievementSessionRecord[]): boolean {
  for (let i = 1; i < sessions.length; i++) {
    const gapDays =
      (sessions[i]!.completedAt - sessions[i - 1]!.completedAt) / 86_400_000;
    if (gapDays >= 30) return true;
  }
  return false;
}

/** Longest run of consecutive app-open days with zero sessions recorded that day (st_08 "Ghost"). */
function computeGhostDayStreak(
  appOpens: string[],
  sessions: AchievementSessionRecord[],
): number {
  const sessionDates = new Set(sessions.map((s) => s.dateKey));
  const opens = [...new Set(appOpens)].sort();
  let longest = 0;
  let current = 0;
  let prevDate: string | null = null;
  for (const d of opens) {
    if (sessionDates.has(d)) {
      current = 0;
      prevDate = d;
      continue;
    }
    if (prevDate) {
      const diffDays = Math.round(
        (new Date(d).getTime() - new Date(prevDate).getTime()) / 86_400_000,
      );
      current = diffDays === 1 ? current + 1 : 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
    prevDate = d;
  }
  return longest;
}

// ─── Metric dispatch ────────────────────────────────────────────────────

function computeMetric(metric: AchievementMetric, ctx: AchievementContext): number {
  const { validSessions, sessions, streak, firstCardEver, appOpens, referral, referredActiveFriends, isGuest } =
    ctx;

  switch (metric) {
    case "cardsDrawnTotal":
      return sumBy(validSessions, (s) => s.cardsDrawn);
    case "maxCardsInSession":
      return validSessions.reduce((m, s) => Math.max(m, s.cardsDrawn), 0);
    case "fullDeckSessionsCount":
      return validSessions.filter((s) => s.isFullDeckSession).length;
    case "kingCardsDrawnTotal":
      return sumBy(validSessions, (s) => s.kingCount);
    case "aceCardsDrawnTotal":
      return sumBy(validSessions, (s) => s.aceCount);
    case "jokerCardsDrawnTotal":
      return sumBy(validSessions, (s) => s.jokerCount);
    case "royalFlushSessionsCount":
      return validSessions.filter((s) => s.hasRoyalFlush).length;
    case "twoOfSpadesTotal":
      return sumBy(validSessions, (s) => s.twoOfSpadesCount);
    case "firstCardIsSevenHearts":
      return firstCardEver?.rank === "Seven" && firstCardEver?.suit === "Hearts"
        ? 1
        : 0;
    case "consecutiveDuplicateSessionsCount":
      return validSessions.some((s) => s.hasConsecutiveDuplicate) ? 1 : 0;
    case "totalReps":
      return sumBy(validSessions, (s) => s.totalReps);
    case "longestDayStreak":
      return computeLongestDayStreak(streak.history);
    case "identicalSessionDayStreak":
      return computeIdenticalSessionDayStreak(validSessions);
    case "ghostDayStreak":
      return computeGhostDayStreak(appOpens, sessions);
    case "validSessionsCount":
      return validSessions.length;
    case "fullDeckNoSkipCount":
      return validSessions.filter((s) => s.isFullDeckSession && s.skipsCount === 0)
        .length;
    case "hasComebackGap":
      return hasComebackGap(validSessions) ? 1 : 0;
    case "earlyBirdCount":
      return validSessions.some((s) => s.hour < 7) ? 1 : 0;
    case "nightOwlCount":
      return validSessions.some((s) => s.hour >= 22) ? 1 : 0;
    case "lunchGrindCount":
      return validSessions.some((s) => s.hour === 12) ? 1 : 0;
    case "speedDemonCount":
      return validSessions.some(
        (s) =>
          s.totalCardsInSession >= 20 && s.cardsDrawn >= 20 && s.durationSeconds < 600,
      )
        ? 1
        : 0;
    case "marathonerCount":
      return validSessions.some((s) => s.durationSeconds > 3600) ? 1 : 0;
    case "graveyardShiftCount":
      return validSessions.some((s) => s.hour >= 0 && s.hour < 4) ? 1 : 0;
    case "consecutiveMondayWeeks":
      return computeConsecutiveMondayWeeks(validSessions);
    case "christmasSessionCount":
      return validSessions.some((s) => isMonthDay(s.dateKey, 12, 25)) ? 1 : 0;
    case "newYearSessionCount":
      return validSessions.some((s) => isMonthDay(s.dateKey, 1, 1)) ? 1 : 0;
    case "fridaySessionCount":
      return validSessions.filter((s) => s.dayOfWeek === 5).length;
    case "patienceFlag":
      return getPatienceFlag(isGuest) ? 1 : 0;
    case "weightVestSessionCount":
      return validSessions.some((s) => s.equipmentSnapshot.weightVest) ? 1 : 0;
    case "bandSessionCount":
      return validSessions.filter(
        (s) => s.equipmentSnapshot.resistanceBandLong || s.equipmentSnapshot.resistanceBandShort,
      ).length;
    case "ringsFullSessionCount":
      return validSessions.some(
        (s) => s.equipmentSnapshot.rings && s.cardsDrawn >= s.totalCardsInSession,
      )
        ? 1
        : 0;
    case "uniqueDeckCategoriesCount":
      return new Set(validSessions.map((s) => s.deckCategory)).size;
    case "proDeckSessionCount":
      return validSessions.some((s) => s.usedProDeck) ? 1 : 0;
    case "consecutiveSameDeckCount":
      return computeConsecutiveSameDeckCount(validSessions);
    case "minimalistSessionCount":
      return validSessions.some(
        (s) =>
          s.cardsDrawn >= s.totalCardsInSession &&
          s.uniqueExerciseCount > 0 &&
          s.uniqueExerciseCount <= 2,
      )
        ? 1
        : 0;
    case "referralSuccessCount":
      return referral?.successfulReferrals ?? 0;
    case "referredActiveFriendsCount":
      return referredActiveFriends;
    case "otherAchievementsUnlockedCount":
      return 0; // special-cased in computeAchievementViews
    case "totalSkipsExact":
      return sumBy(validSessions, (s) => s.skipsCount);
    case "mirrorImageSessionCount":
      return validSessions.some((s) => s.hasMirrorImage) ? 1 : 0;
    default:
      return 0;
  }
}

// ─── Claim state persistence ────────────────────────────────────────────

export interface AchievementClaimState {
  claimed: boolean;
  claimedAt: string | null;
  /** False until the user has visited the Achievements page since this unlocked — drives the nav bar's red dot. */
  seen: boolean;
  /** Non-subscriber-only: the "you would have unlocked X" toast only fires once per achievement. */
  notifiedAlmost?: boolean;
}

type ClaimStore = Record<string, AchievementClaimState>;

function claimStoreKey(isGuest: boolean): string {
  return isGuest ? "mbw_achievements_guest" : "mbw_achievements_user";
}

function readClaimStore(isGuest: boolean): ClaimStore {
  try {
    const raw = localStorage.getItem(claimStoreKey(isGuest));
    return raw ? (JSON.parse(raw) as ClaimStore) : {};
  } catch {
    return {};
  }
}

function writeClaimStore(isGuest: boolean, store: ClaimStore): void {
  localStorage.setItem(claimStoreKey(isGuest), JSON.stringify(store));
}

// ─── Views ──────────────────────────────────────────────────────────────

export interface AchievementView extends Achievement {
  progress: number;
  /** Target reached, regardless of subscription tier — tracked for everyone per spec. */
  earned: boolean;
  /** Actually granted (subscriber-only). */
  unlocked: boolean;
  /** Earned but withheld because the account isn't a subscriber — the "gold, almost" state. */
  almostUnlocked: boolean;
  unlockedAt: string | null;
  seen: boolean;
}

export function computeAchievementViews(
  ctx: AchievementContext,
  isSubscriber: boolean,
): AchievementView[] {
  const claims = readClaimStore(ctx.isGuest);

  const rawByAchievement = new Map<string, number>();
  for (const a of ALL_ACHIEVEMENTS) {
    if (a.metric === "otherAchievementsUnlockedCount") continue;
    rawByAchievement.set(a.id, computeMetric(a.metric, ctx));
  }
  const earnedCount = ALL_ACHIEVEMENTS.filter((a) => {
    const raw = rawByAchievement.get(a.id);
    if (raw === undefined) return false;
    return a.exactMatch ? raw === a.target : raw >= a.target;
  }).length;

  return ALL_ACHIEVEMENTS.map((a) => {
    const raw =
      a.metric === "otherAchievementsUnlockedCount"
        ? earnedCount
        : (rawByAchievement.get(a.id) ?? 0);
    const progress = Math.max(0, Math.min(a.target, raw));
    const earned = a.exactMatch ? raw === a.target : raw >= a.target;
    const claim = claims[a.id];
    const claimed = claim?.claimed ?? false;
    return {
      ...a,
      progress,
      earned,
      unlocked: claimed,
      almostUnlocked: earned && !claimed && !isSubscriber,
      unlockedAt: claim?.claimedAt ?? null,
      seen: claim ? claim.seen : true,
    };
  });
}

// ─── Session-end processing ─────────────────────────────────────────────

export interface SessionAchievementResult {
  /** Subscribers only — actually claimed, should play the unlock animation + notification. */
  newlyUnlocked: Achievement[];
  /** Non-subscribers only — earned but withheld, should show the "almost unlocked" toast once. */
  newlyAlmost: Achievement[];
}

export function processSessionAchievements(
  ctx: AchievementContext,
  isSubscriber: boolean,
): SessionAchievementResult {
  const views = computeAchievementViews(ctx, isSubscriber);
  const claims = readClaimStore(ctx.isGuest);
  const newlyUnlocked: Achievement[] = [];
  const newlyAlmost: Achievement[] = [];

  for (const v of views) {
    const claim = claims[v.id];
    if (!v.earned || claim?.claimed) continue;

    if (isSubscriber) {
      claims[v.id] = { claimed: true, claimedAt: new Date().toISOString(), seen: false };
      newlyUnlocked.push(v);
    } else if (!claim?.notifiedAlmost) {
      claims[v.id] = {
        claimed: false,
        claimedAt: null,
        seen: true,
        notifiedAlmost: true,
      };
      newlyAlmost.push(v);
    }
  }

  writeClaimStore(ctx.isGuest, claims);
  return { newlyUnlocked, newlyAlmost };
}

/** Called right after a successful subscription purchase — grants every achievement already earned but withheld, in one batch, for a queued unlock-animation sequence. */
export function reconcileAchievementsOnSubscribe(
  ctx: AchievementContext,
): Achievement[] {
  const views = computeAchievementViews(ctx, true);
  const claims = readClaimStore(ctx.isGuest);
  const granted: Achievement[] = [];

  for (const v of views) {
    const claim = claims[v.id];
    if (v.earned && !claim?.claimed) {
      claims[v.id] = { claimed: true, claimedAt: new Date().toISOString(), seen: false };
      granted.push(v);
    }
  }

  writeClaimStore(ctx.isGuest, claims);
  return granted;
}

export function hasUnseenUnlocks(isGuest: boolean): boolean {
  const claims = readClaimStore(isGuest);
  return Object.values(claims).some((c) => c.claimed && !c.seen);
}

export function markAllAchievementsSeen(isGuest: boolean): void {
  const claims = readClaimStore(isGuest);
  let changed = false;
  for (const id of Object.keys(claims)) {
    const entry = claims[id]!;
    if (entry.claimed && !entry.seen) {
      entry.seen = true;
      changed = true;
    }
  }
  if (changed) writeClaimStore(isGuest, claims);
}

// ─── Pending unlock-animation queue (subscribe-time batch grant) ──────────
// Purchasing can't render an animation overlay itself (it fires from
// `useTier().purchase()`, which isn't guaranteed to be mounted anywhere
// with a place to show a full-screen overlay) — so newly-granted
// achievements are stashed here and drained by whichever screen the user
// lands on next (Home, right after checkout).

const PENDING_ANIM_GUEST_KEY = "mbw_achv_pending_anim_guest";
const PENDING_ANIM_USER_KEY = "mbw_achv_pending_anim_user";

function pendingAnimKey(isGuest: boolean): string {
  return isGuest ? PENDING_ANIM_GUEST_KEY : PENDING_ANIM_USER_KEY;
}

export function queuePendingUnlockAnimations(
  isGuest: boolean,
  achievements: Achievement[],
): void {
  if (achievements.length === 0) return;
  localStorage.setItem(pendingAnimKey(isGuest), JSON.stringify(achievements));
}

export function drainPendingUnlockAnimations(isGuest: boolean): Achievement[] {
  const key = pendingAnimKey(isGuest);
  try {
    const raw = localStorage.getItem(key);
    localStorage.removeItem(key);
    return raw ? (JSON.parse(raw) as Achievement[]) : [];
  } catch {
    return [];
  }
}

// ─── Migration (guest -> registered, on sign-up) ───────────────────────────

export function migrateGuestAchievementClaims(): void {
  const from = claimStoreKey(true);
  const to = claimStoreKey(false);
  const raw = localStorage.getItem(from);
  if (raw && !localStorage.getItem(to)) {
    localStorage.setItem(to, raw);
  }
  if (raw) localStorage.removeItem(from);
}
