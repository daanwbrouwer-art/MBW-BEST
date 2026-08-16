import { Capacitor, registerPlugin } from "@capacitor/core";

interface AppSettingsPlugin {
  open(): Promise<void>;
}

// Backed by android/app/src/main/java/com/mybodyweight/app/AppSettingsPlugin.java
// on Android. No native counterpart needed on iOS — see openAppSettings()
// below, which never touches this on that platform.
const AppSettingsNative = registerPlugin<AppSettingsPlugin>("AppSettings");

/**
 * Deep-links to this app's own system settings page, so a user who denied a
 * permission (location, notifications, ...) can flip it back on without
 * hunting through the OS settings themselves.
 *
 * - iOS: the native `app-settings:` URL scheme opens Settings > MyBodyWeight
 *   directly — no Capacitor plugin required.
 * - Android: there's no equivalent web URL scheme, so this routes through a
 *   small custom plugin (AppSettingsPlugin.java) that fires
 *   ACTION_APPLICATION_DETAILS_SETTINGS for this app's package.
 * - Web: no-op — there's no OS settings page to deep-link to; the browser
 *   owns the permission UI itself (usually the address-bar padlock/site info).
 */
export async function openAppSettings(): Promise<void> {
  const platform = Capacitor.getPlatform();
  if (platform === "ios") {
    window.location.href = "app-settings:";
    return;
  }
  if (platform === "android") {
    try {
      await AppSettingsNative.open();
    } catch {
      // Stale native build without the plugin registered yet — nothing
      // else to fall back to; the in-app banner text already tells the
      // user to open Settings manually in that case.
    }
  }
}
