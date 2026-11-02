import {
  cancelDailyReminders,
  cancelWeeklySummary,
  checkLocalNotificationPermission,
  isLocalNotificationCapable,
  requestLocalNotificationPermission,
  scheduleDailyReminders,
  scheduleWeeklySummary,
} from "@/lib/localNotifications";
import { useCallback, useEffect, useState } from "react";

// Device-level, not per-account: browser notification permission is scoped
// to the origin, not to whichever MyBodyWeight profile is logged in, so this
// intentionally lives outside the guest/user onboarding split.
const NOTIFICATIONS_KEY = "mbw_notifications";

export interface NotificationSettings {
  enabled: boolean;
  reminders: boolean;
  weeklySummary: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  reminders: false,
  weeklySummary: false,
};

function readSettings(): NotificationSettings | null {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NotificationSettings;
  } catch {
    return null;
  }
}

function writeSettings(settings: NotificationSettings): void {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(settings));
}

/** True once the first-run permission screen has been shown, regardless of the choice made. */
export function hasSeenNotificationPrompt(): boolean {
  return localStorage.getItem(NOTIFICATIONS_KEY) !== null;
}

export function useNotifications() {
  const [settings, setSettings] = useState<NotificationSettings>(
    () => readSettings() ?? DEFAULT_SETTINGS,
  );

  // Web Notification API permission — meaningless on native (no such API in
  // the WebView), kept only for the browser-dev fallback path. UI that
  // needs to know "is the user actually blocked right now" on any platform
  // should use `isBlocked` below instead, which is native-aware.
  const browserPermission =
    typeof Notification !== "undefined" ? Notification.permission : "default";

  const [nativePermission, setNativePermission] = useState<
    "granted" | "denied" | "prompt"
  >("prompt");
  useEffect(() => {
    if (!isLocalNotificationCapable()) return;
    checkLocalNotificationPermission().then(setNativePermission);
  }, []);
  const isBlocked = isLocalNotificationCapable()
    ? nativePermission === "denied"
    : browserPermission === "denied";

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (isLocalNotificationCapable()) {
      return requestLocalNotificationPermission();
    }
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  const updateSettings = useCallback((patch: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      writeSettings(next);
      return next;
    });
  }, []);

  // Turning a setting on re-triggers the OS/browser permission prompt if it
  // hasn't been granted yet, then (on native) schedules the real device
  // notifications for it; turning off never needs permission, but does
  // cancel whatever was scheduled so a toggled-off reminder can't still
  // fire from a stale schedule.
  const toggle = useCallback(
    async (key: "reminders" | "weeklySummary") => {
      const currentlyOn = settings[key];
      if (currentlyOn) {
        updateSettings({ [key]: false });
        if (key === "reminders") await cancelDailyReminders();
        else await cancelWeeklySummary();
        return;
      }
      const granted = await requestPermission();
      if (isLocalNotificationCapable()) {
        setNativePermission(await checkLocalNotificationPermission());
      }
      if (!granted) return;
      updateSettings({ enabled: true, [key]: true });
      if (key === "reminders") await scheduleDailyReminders();
      else await scheduleWeeklySummary();
    },
    [settings, requestPermission, updateSettings],
  );

  return {
    settings,
    browserPermission,
    isBlocked,
    requestPermission,
    updateSettings,
    toggle,
  };
}
