// What happens on this device when an account signs in or out.
//
// Everything account-specific that the app keeps in localStorage (onboarding
// answers, streaks, achievements, custom decks, the in-progress workout, the
// web mock subscription) used to be shared by whoever signed in on the phone.
// This module ties it to one account (mbw_owner, see lib/accountScope.ts):
//
//  - signing in as a different account than the data belongs to wipes it
//    first. Data an older app version left with no owner is adopted, not
//    wiped: streaks and achievements exist only on the phone, and on almost
//    every phone the returning user is the same person;
//  - signing out uploads anything not yet synced (best effort, time
//    limited), ends the Supabase session, logs RevenueCat out and clears the
//    in-progress workout and caches. The account's data stays on the phone
//    under its owner (guests use separate keys and can't see it), so signing
//    back in keeps the streak; a different account signing in wipes it;
//  - signing in (and every app start while signed in) links RevenueCat to the
//    account id first, then syncs onboarding answers and custom decks.
import {
  OWNER_KEY,
  bumpGeneration,
  captureScope,
  isScopeCurrent,
} from "@/lib/accountScope";
import { pullCustomDecks } from "@/lib/customDeckSync";
import { syncOnboardingWithServer } from "@/lib/onboardingSync";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabaseClient";
import { useCustomWorkoutStore } from "@/store/customWorkout";
import { useWorkoutStore } from "@/store/workout";
import { Capacitor } from "@capacitor/core";
import { Purchases } from "@revenuecat/purchases-capacitor";

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
  return (
    DEVICE_KEYS.has(key) || key.endsWith("_guest") || key.startsWith("mbw_guest_")
  );
}

function accountKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("mbw_") && !isDeviceKey(key)) keys.push(key);
  }
  return keys;
}

/** Removes every account-specific mbw_* key and resets the in-memory state. */
export function wipeAccountData(): void {
  for (const key of accountKeys()) localStorage.removeItem(key);
  useWorkoutStore.getState().reset();
  useWorkoutStore.setState({
    guestMode: false,
    savedWorkoutId: null,
    recordedWorkoutId: null,
  });
  useCustomWorkoutStore.setState({ selected: [], decks: [], deletedIds: [] });
  queryClient.clear();
}

const isNative = Capacitor.isNativePlatform();

// useTier waits for this before asking RevenueCat who is subscribed, so a
// paying user never sees the anonymous (free) state while the account is
// being linked on launch. Resolves after the first link attempt, or after
// a few seconds at most.
let resolvePurchasesReady: () => void = () => {};
export const purchasesReady = new Promise<void>((resolve) => {
  resolvePurchasesReady = resolve;
  setTimeout(resolve, 6000);
});

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

/** Syncs onboarding answers and custom decks for `userId`. Never throws. */
async function syncAccount(userId: string): Promise<void> {
  const scope = captureScope(userId);
  await Promise.all([
    syncOnboardingWithServer(scope).catch((err) =>
      console.warn("Onboarding sync failed:", err),
    ),
    pullCustomDecks(scope).catch((err) =>
      console.warn("Custom deck sync failed:", err),
    ),
  ]);
}

/**
 * Finishes a sign-in or sign-up, before navigating:
 *  1. wipes another account's data (or ownerless data from an older build);
 *  2. marks the device as this account's (mbw_owner, mbw_user);
 *  3. runs `afterLocalSetup` (sign-up copies guest progress across here, so
 *     the sync below uploads it);
 *  4. links RevenueCat, then syncs onboarding answers and custom decks.
 * Never throws: a sync problem must not block signing in.
 */
export async function completeSignIn(
  profile: unknown,
  afterLocalSetup?: () => void,
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  bumpGeneration();
  if (userId) {
    const owner = localStorage.getItem(OWNER_KEY);
    if (owner && owner !== userId) wipeAccountData();
    localStorage.setItem(OWNER_KEY, userId);
  }
  // bigints in the profile serialise via the BigInt toJSON patch in main.tsx.
  localStorage.setItem("mbw_user", JSON.stringify(profile));
  afterLocalSetup?.();
  if (!userId) {
    resolvePurchasesReady();
    return;
  }
  await linkPurchases(userId);
  resolvePurchasesReady();
  await syncAccount(userId);
}

/** Once per app start: same linking and syncing while already signed in. */
export async function resumeSignedInSession(): Promise<void> {
  try {
    if (localStorage.getItem("mbw_user") === null) return;
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    const owner = localStorage.getItem(OWNER_KEY);
    if (owner && owner !== userId) {
      // The stored data belongs to someone else: keep this sign-in, drop
      // their data.
      const signedIn = localStorage.getItem("mbw_user");
      wipeAccountData();
      if (signedIn) localStorage.setItem("mbw_user", signedIn);
    }
    // First start after updating while signed in: adopt the existing data.
    localStorage.setItem(OWNER_KEY, userId);
    bumpGeneration();
    await linkPurchases(userId);
    resolvePurchasesReady();
    await syncAccount(userId);
  } finally {
    resolvePurchasesReady();
  }
}

/** Waits for `promise` up to `ms`, never rejecting. */
function withinMs(promise: Promise<unknown>, ms: number): Promise<void> {
  return Promise.race([
    promise.then(
      () => undefined,
      () => undefined,
    ),
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ]);
}

/**
 * Signs out on this device. First tries (for up to 4 s) to upload anything
 * not synced yet, then ends the Supabase session, logs RevenueCat out and
 * clears the in-progress workout and cached server data. The account's
 * local data stays, owned by the account (see the module comment).
 */
export async function signOut(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (userId && localStorage.getItem(OWNER_KEY) === userId) {
    const scope = captureScope(userId);
    if (isScopeCurrent(scope)) {
      await withinMs(
        Promise.all([
          syncOnboardingWithServer(scope),
          pullCustomDecks(scope),
        ]),
        4000,
      );
    }
  }
  bumpGeneration();
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (err) {
    console.warn("Supabase signOut failed:", err);
  }
  await unlinkPurchases();
  localStorage.removeItem("mbw_user");
  // The web-only mock subscription belongs to whoever bought it on this
  // browser session; never carry premium over to the next person.
  localStorage.removeItem("mbw_subscription");
  useWorkoutStore.getState().reset();
  useWorkoutStore.setState({ guestMode: false });
  useCustomWorkoutStore.setState({ selected: [] });
  queryClient.clear();
}
