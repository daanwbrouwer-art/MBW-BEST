import type { TrialData, TrialStatus } from "@/types/trial";

// Device-level, like mbw_subscriber/mbw_streak_user — this app has no
// per-account server, so "one trial per account" is approximated as "one
// trial per device", matching every other piece of account state here.
const TRIAL_KEY = "mbw_trial";
const TRIAL_DAYS = 7;
const POST_TRIAL_NUDGE_WINDOW_DAYS = 14;

export function readTrial(): TrialData | null {
  try {
    const raw = localStorage.getItem(TRIAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TrialData;
  } catch {
    return null;
  }
}

function writeTrial(data: TrialData): void {
  localStorage.setItem(TRIAL_KEY, JSON.stringify(data));
}

/** Trial is one-time only: once a record exists at all — active, expired, or converted — never re-activate, even for a different account registered later on this device. */
export function hasEverHadTrial(): boolean {
  return readTrial() !== null;
}

/** Activates the 7-day trial on registration (Guest -> Registered). No-op if a trial has ever existed on this device. */
export function activateTrial(now: Date = new Date()): TrialData {
  const existing = readTrial();
  if (existing) return existing;
  const end = new Date(now.getTime() + TRIAL_DAYS * 86_400_000);
  const data: TrialData = {
    active: true,
    startDate: now.toISOString(),
    endDate: end.toISOString(),
    converted: false,
  };
  writeTrial(data);
  return data;
}

export function markTrialConverted(): void {
  const t = readTrial();
  if (!t) return;
  writeTrial({ ...t, converted: true });
}

/**
 * Current trial phase. The "active" branch's `dayNumber` (1-7) and
 * `daysLeft` (0-6) drive which home-screen banner variant shows:
 * dayNumber 1-5 -> slim banner, 6 -> "1 day left", 7 -> "ends today".
 */
export function getTrialStatus(now: Date = new Date()): TrialStatus {
  const t = readTrial();
  if (!t) return { kind: "none" };

  const start = new Date(t.startDate);
  const end = new Date(t.endDate);

  if (t.active && now.getTime() < end.getTime()) {
    const elapsedDays = Math.floor(
      (now.getTime() - start.getTime()) / 86_400_000,
    );
    const dayNumber = Math.min(TRIAL_DAYS, Math.max(1, elapsedDays + 1));
    const daysLeft = Math.max(0, TRIAL_DAYS - dayNumber);
    return { kind: "active", daysLeft, dayNumber };
  }

  const daysSinceExpiry = Math.max(
    0,
    Math.floor((now.getTime() - end.getTime()) / 86_400_000),
  );
  return { kind: "expired", daysSinceExpiry };
}

/**
 * Flips `trial.active` to false the first time expiry is detected and
 * reports whether this call is the one that just discovered it — the
 * caller uses that to show the one-time "trial ended" full-screen modal.
 * Idempotent: every call after the first no-ops (active is already false).
 */
export function processTrialExpiryOnce(now: Date = new Date()): boolean {
  const t = readTrial();
  if (!t || !t.active) return false;
  const end = new Date(t.endDate);
  if (now.getTime() < end.getTime()) return false;
  writeTrial({ ...t, active: false });
  return true;
}

export function isWithinPostTrialNudgeWindow(now: Date = new Date()): boolean {
  const status = getTrialStatus(now);
  return (
    status.kind === "expired" &&
    status.daysSinceExpiry <= POST_TRIAL_NUDGE_WINDOW_DAYS
  );
}
