// What happens on this device when an account signs in or out.
//
// Everything account-specific that the app keeps in localStorage (onboarding
// answers, streaks, achievements, custom decks, the in-progress workout, the
// web mock subscription) used to be shared by whoever signed in on the phone.
// This module ties it to one account:
//
//  - signing in as a different account than last time wipes the previous
//    account's local data first;
//  - signing out ends the Supabase session, logs RevenueCat out and wipes it;
//  - signing in (and every app start while signed in) links RevenueCat to the
//    account id, and syncs onboarding answers and custom decks with the
//    server, so a new phone or a reinstall picks them up.
import { pullCustomDecks } from "@/lib/customDeckSync";
import { syncOnboardingWithServer } from "@/lib/onboardingSync";
import { supabase } from "@/lib/supabaseClient";
import { useCustomWorkoutStore } from "@/store/customWorkout";
import { useWorkoutStore } from "@/store/workout";
import { Capacitor } from "@capacitor/core";
import { Purchases } from "@revenuecat/purchases-capacitor";

/** Which account the local data on this device belongs to. */
const OWNER_KEY = "mbw_owner";

/**
 * Device-level settings that are not tied to an account and survive sign-out:
 * the once-per-device trial marker, theme, reminder settings, whether we
 * already asked for location, the first-launch tips flag, guest-mode data
 * (it belongs to the device, not an account), and the local dev backend.
 */
const DEVICE_KEYS = new Set([
  "mbw_trial",
  "mbw_palette",
  "mbw_palette_votes",
  "mbw_notifications",
  "mbw_location_prompted",
  "mbw_first_login",
  "mbw_accounts_db",
]);

function isDeviceKey(key: string): boolean {
  return DEVICE_KEYS.has(key) || key.endsWith("_guest") || key.startsWith("mbw_guest_");
}

/** Removes every account-specific mbw_* key from this device. */
export function wipeAccountData(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("mbw_") && !isDeviceKey(key)) keys.push(key);
  }
  for (const key of keys) localStorage.removeItem(key);
  // The persisted stores keep their state in memory too.
  useWorkoutStore.getState().reset();
  useWorkoutStore.getState().setGuestMode(false);
  useCustomWorkoutStore.setState({ selected: [], decks: [], deletedIds: [] });
}

const isNative = Capacitor.isNativePlatform();

async function linkPurchases(userId: string): Promise<void> {
  if (!isNative) return;
  try {
    await Purchases.logIn({ appUserID: userId });
  } catch (err) {
    console.warn("RevenueCat logIn failed:", err);
  }
}

async function unlinkPurchases(): Promise<void> {
  if (!isNative) return;
  try {
    await Purchases.logOut();
  } catch {
    // logOut throws when the current user is already anonymous.
  }
}

/**
 * Call right after a successful sign-in, before navigating. Wipes another
 * account's leftovers, links RevenueCat, and pulls onboarding answers and
 * custom decks from the server. Never throws: a sync problem must not block
 * signing in.
 */
export async function onSignedIn(userId: string): Promise<void> {
  const owner = localStorage.getItem(OWNER_KEY);
  if (owner && owner !== userId) wipeAccountData();
  localStorage.setItem(OWNER_KEY, userId);
  await Promise.all([
    linkPurchases(userId),
    syncOnboardingWithServer(userId).catch((err) =>
      console.warn("Onboarding sync failed:", err),
    ),
    pullCustomDecks().catch((err) =>
      console.warn("Custom deck sync failed:", err),
    ),
  ]);
}

/**
 * Finishes a sign-in or sign-up: runs onSignedIn for the new session, then
 * marks the device as signed in (mbw_user). The order matters: switching
 * accounts wipes account data, and mbw_user is account data.
 */
export async function completeSignIn(profile: unknown): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (userId) await onSignedIn(userId);
  // bigints in the profile serialise via the BigInt toJSON patch in main.tsx.
  localStorage.setItem("mbw_user", JSON.stringify(profile));
}

/** Runs once per app start while signed in (same work as onSignedIn). */
export async function resumeSignedInSession(): Promise<void> {
  if (localStorage.getItem("mbw_user") === null) return;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;
  await onSignedIn(userId);
}

/**
 * Signs out everywhere on this device: ends the Supabase session, logs
 * RevenueCat out, and removes the account's local data.
 */
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (err) {
    console.warn("Supabase signOut failed:", err);
  }
  await unlinkPurchases();
  localStorage.removeItem("mbw_user");
  localStorage.removeItem(OWNER_KEY);
  wipeAccountData();
}
