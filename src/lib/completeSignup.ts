// Shared post-registration logic used by every sign-up entry point
// (email form, and eventually social buttons once real OAuth exists).
// Keeps "what happens right after an account is created" in one place
// instead of duplicated across pages.
import { migrateGuestAchievementClaims } from "@/lib/achievementEngine";
import { migrateGuestAchievementData } from "@/lib/achievementSessionLog";
import { migrateGuestChallenge } from "@/lib/challenge";

const GUEST_ONBOARDING_KEY = "mbw_guest_onboarding";
const USER_ONBOARDING_KEY = "mbw_onboarding";
const GUEST_STREAK_KEY = "mbw_streak_guest";
const USER_STREAK_KEY = "mbw_streak_user";

/**
 * Copies a guest's in-progress onboarding answers onto the new account so
 * they aren't asked to redo the 7-step flow after signing up. No-op if the
 * guest never started onboarding.
 */
export function migrateGuestOnboarding(): void {
  const guestRaw = localStorage.getItem(GUEST_ONBOARDING_KEY);
  if (!guestRaw) return;
  localStorage.setItem(USER_ONBOARDING_KEY, guestRaw);
  localStorage.removeItem(GUEST_ONBOARDING_KEY);
}

/**
 * Copies a guest's streak (weekly goal, history, best exercise, training
 * days this year) onto the new account so nothing is lost on registration —
 * streaks must persist across every tier per spec.
 */
export function migrateGuestStreak(): void {
  const guestRaw = localStorage.getItem(GUEST_STREAK_KEY);
  if (!guestRaw) return;
  localStorage.setItem(USER_STREAK_KEY, guestRaw);
  localStorage.removeItem(GUEST_STREAK_KEY);
}

/**
 * Copies a guest's achievement progress (per-session log, first-card-ever,
 * app-open log, claimed/seen state) onto the new account — same rationale
 * as the streak migration above: progress must survive registration.
 */
export function migrateGuestAchievements(): void {
  migrateGuestAchievementData();
  migrateGuestAchievementClaims();
}

/** Copies a guest's in-progress weekly challenge onto the new account so an already-started week's progress isn't lost on registration. */
export function migrateGuestWeeklyChallenge(): void {
  migrateGuestChallenge();
}

/** Reads the (possibly just-migrated) onboarding completion flag for the now-logged-in account. */
export function hasCompletedOnboarding(): boolean {
  try {
    const raw = localStorage.getItem(USER_ONBOARDING_KEY);
    if (!raw) return false;
    return JSON.parse(raw).hasCompletedOnboarding === true;
  } catch {
    return false;
  }
}
