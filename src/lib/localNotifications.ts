// Real, device-scheduled notifications for native builds (Capacitor
// LocalNotifications) — fires even when the app is closed, unlike the web
// `Notification` API used as a browser-dev fallback elsewhere. Web
// `Notification` is also NOT bridged inside an Android WebView, so
// anything that needs to actually show up as a system notification on a
// real device has to go through this module on native.
//
// Capacitor's local notifications can't run app JS at fire time, so a
// "smart, dynamic" reminder (e.g. computing this week's real stats right
// as the notification fires) isn't possible client-only. The design here
// instead pre-schedules a rolling window of notifications with their
// content decided up front, and re-tops-up that window every time the app
// is opened (see `refreshScheduledNotifications`, called from HomePage) so
// it never silently runs dry.
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  DAILY_NOTIFICATION_TITLE,
  getDailyNotificationBody,
} from "@/lib/notificationContent";

const DAILY_REMINDER_HOUR = 8;
const DAILY_REMINDER_MINUTE = 0;
const DAILY_REMINDER_WINDOW_DAYS = 30;
const WEEKLY_SUMMARY_HOUR = 18;
const WEEKLY_SUMMARY_MINUTE = 0;
const WEEKLY_SUMMARY_WINDOW_WEEKS = 8;

// Local notification ids are 32-bit ints, and the two schedules must never
// collide with each other or with the ad-hoc immediate notifications fired
// by `presentLocalNotification` below — split into disjoint ranges instead
// of hashing, so a collision is structurally impossible rather than just
// unlikely.
const DAILY_REMINDER_ID_BASE = 1_000_000; // 1,000,000..1,000,029
const WEEKLY_SUMMARY_ID_BASE = 2_000_000; // 2,000,000..2,000,007
const IMMEDIATE_ID_BASE = 3_000_000; // 3,000,000+, one-off

export function isLocalNotificationCapable(): boolean {
  return Capacitor.isNativePlatform();
}

/** Requests the native notification permission (Android 13+ requires this explicitly; iOS always does). Never throws — a denial just means the caller's `enabled` toggle stays off. */
export async function requestLocalNotificationPermission(): Promise<boolean> {
  if (!isLocalNotificationCapable()) return false;
  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted";
  } catch {
    return false;
  }
}

async function hasPermission(): Promise<boolean> {
  const state = await checkLocalNotificationPermission();
  return state === "granted";
}

/** Current native permission state, for UI that needs to show "you blocked this, go re-enable it in system settings" — distinct from the web Notification API's permission, which use-notifications.ts's `browserPermission` still tracks for the browser-dev fallback. Returns `"prompt"` outside a native build (nothing to check). */
export async function checkLocalNotificationPermission(): Promise<
  "granted" | "denied" | "prompt"
> {
  if (!isLocalNotificationCapable()) return "prompt";
  try {
    const result = await LocalNotifications.checkPermissions();
    if (result.display === "granted") return "granted";
    if (result.display === "denied") return "denied";
    return "prompt";
  } catch {
    return "prompt";
  }
}

function dailyReminderIds(): number[] {
  return Array.from(
    { length: DAILY_REMINDER_WINDOW_DAYS },
    (_, i) => DAILY_REMINDER_ID_BASE + i,
  );
}

function weeklySummaryIds(): number[] {
  return Array.from(
    { length: WEEKLY_SUMMARY_WINDOW_WEEKS },
    (_, i) => WEEKLY_SUMMARY_ID_BASE + i,
  );
}

/** Next occurrence of `hour:minute` strictly after `from` — today if it hasn't happened yet, otherwise tomorrow. */
function nextTimeAt(from: Date, hour: number, minute: number): Date {
  const next = new Date(from);
  next.setHours(hour, minute, 0, 0);
  if (next <= from) next.setDate(next.getDate() + 1);
  return next;
}

/** Next Sunday at `hour:minute` strictly after `from`. */
function nextSundayAt(from: Date, hour: number, minute: number): Date {
  const next = new Date(from);
  next.setHours(hour, minute, 0, 0);
  const daysUntilSunday = (7 - next.getDay()) % 7;
  next.setDate(next.getDate() + daysUntilSunday);
  if (next <= from) next.setDate(next.getDate() + 7);
  return next;
}

/**
 * (Re)schedules the next `DAILY_REMINDER_WINDOW_DAYS` days of the daily
 * quote/aspiration/reading notification, replacing whatever was scheduled
 * before — cancel-then-reschedule rather than "add more on top" so this is
 * safe to call repeatedly (e.g. every app open) without ever double-booking
 * a day.
 */
export async function scheduleDailyReminders(): Promise<void> {
  if (!isLocalNotificationCapable()) return;
  if (!(await hasPermission())) return;

  const ids = dailyReminderIds();
  await LocalNotifications.cancel({
    notifications: ids.map((id) => ({ id })),
  });

  const now = new Date();
  const first = nextTimeAt(now, DAILY_REMINDER_HOUR, DAILY_REMINDER_MINUTE);
  const notifications = ids.map((id, i) => {
    const fireDate = new Date(first);
    fireDate.setDate(fireDate.getDate() + i);
    return {
      id,
      title: DAILY_NOTIFICATION_TITLE,
      body: getDailyNotificationBody(fireDate),
      schedule: { at: fireDate },
    };
  });
  await LocalNotifications.schedule({ notifications });
}

/**
 * (Re)schedules the next `WEEKLY_SUMMARY_WINDOW_WEEKS` Sundays. Content is
 * necessarily generic (a nudge to open the app), not the real week's
 * numbers — see the module comment on why a pre-scheduled local
 * notification can't embed live stats computed at fire time.
 */
export async function scheduleWeeklySummary(): Promise<void> {
  if (!isLocalNotificationCapable()) return;
  if (!(await hasPermission())) return;

  const ids = weeklySummaryIds();
  await LocalNotifications.cancel({
    notifications: ids.map((id) => ({ id })),
  });

  const now = new Date();
  const first = nextSundayAt(now, WEEKLY_SUMMARY_HOUR, WEEKLY_SUMMARY_MINUTE);
  const notifications = ids.map((id, i) => {
    const fireDate = new Date(first);
    fireDate.setDate(fireDate.getDate() + i * 7);
    return {
      id,
      title: "Your week is in.",
      body: "See your stats, streak, and what to train next.",
      schedule: { at: fireDate },
    };
  });
  await LocalNotifications.schedule({ notifications });
}

export async function cancelDailyReminders(): Promise<void> {
  if (!isLocalNotificationCapable()) return;
  const ids = dailyReminderIds();
  await LocalNotifications.cancel({
    notifications: ids.map((id) => ({ id })),
  });
}

export async function cancelWeeklySummary(): Promise<void> {
  if (!isLocalNotificationCapable()) return;
  const ids = weeklySummaryIds();
  await LocalNotifications.cancel({
    notifications: ids.map((id) => ({ id })),
  });
}

/**
 * Tops up both rolling schedules — called on every app launch (HomePage
 * mount) so a user who opens the app at least once every ~30 days (daily
 * reminders) / ~8 weeks (weekly summary) never runs out of scheduled
 * notifications. No-ops per-schedule for whichever toggle is off. Never
 * throws — scheduling failures shouldn't block anything else on launch.
 */
export async function refreshScheduledNotifications(settings: {
  reminders: boolean;
  weeklySummary: boolean;
}): Promise<void> {
  if (!isLocalNotificationCapable()) return;
  try {
    if (settings.reminders) await scheduleDailyReminders();
    if (settings.weeklySummary) await scheduleWeeklySummary();
  } catch {
    // Best-effort — a failed reschedule just means the existing queue
    // (possibly already stale/empty) is left as-is until the next launch.
  }
}

/**
 * Fires the "🏆 Achievement unlocked" notification through whichever
 * channel actually works on this platform — the native plugin on
 * native builds (where the web `Notification` constructor is a silent
 * no-op inside the WebView), the web `Notification` API in browser dev.
 * Shared by HomePage and WorkoutSummaryPage so the platform branch only
 * lives in one place.
 */
export async function notifyAchievementUnlocked(name: string): Promise<void> {
  const title = `🏆 Achievement unlocked: ${name}!`;
  const body = "Open the app to see it.";
  if (isLocalNotificationCapable()) {
    await presentLocalNotification(title, body);
    return;
  }
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }
  try {
    new Notification(title, { body });
  } catch {
    // Non-fatal — same tolerance the two call sites had before this moved here.
  }
}

/**
 * Immediate, one-off notification — the native equivalent of `new
 * Notification(title, { body })`, for callers that need to show something
 * right now (achievement unlocks, the onboarding permission-screen demo)
 * rather than schedule something for later. No-ops silently without
 * permission or outside a native build; callers that also want a web
 * fallback should call the web `Notification` constructor themselves when
 * `isLocalNotificationCapable()` is false.
 */
export async function presentLocalNotification(
  title: string,
  body: string,
): Promise<void> {
  if (!isLocalNotificationCapable()) return;
  if (!(await hasPermission())) return;
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: IMMEDIATE_ID_BASE + Math.floor(Math.random() * 1_000_000),
          title,
          body,
          schedule: { at: new Date(Date.now() + 500) },
        },
      ],
    });
  } catch {
    // Best-effort, same as the web Notification() callers this mirrors.
  }
}
