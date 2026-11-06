// What happens on this device when an account signs in or out.
//
// Everything account-specific that the app keeps in localStorage (onboarding
// answers, streaks, achievements, custom decks, the in-progress workout, the
// web mock subscription) used to be shared by whoever signed in on the phone.
// This module ties it to one account (mbw_owner, see lib/accountScope.ts):
//
//  - a different account signing in wipes the previous account's data first.
//    A brand-new account also wipes data with no owner (it can't be theirs).
//    An existing account signing in adopts ownerless data left by an older
//    app version: streaks and achievements exist only on the phone, and on
//    almost every phone the returning user is the same person;
//  - signing out uploads anything not yet synced (best effort, time
//    limited), ends the Supabase session, logs RevenueCat out and clears the
//    in-progress workout and caches. The account's data stays on the phone
//    under its owner; guest mode uses separate keys (including separate
//    custom decks), so a guest can't see or change it. Signing back in keeps
//    the streak; a different account signing in wipes it;
//  - signing in (and every app start while signed in) links RevenueCat to the
//    account id first, then syncs onboarding answers and custom decks. Both
//    are time limited for the sign-in screen; the sync carries on in the
//    background, guarded so it never writes into another account's data.
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
import { reloadCustomDecks } from "@/store/customWorkout";
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

/**
 * Removes every account-specific mbw_* key and resets the in-memory state.
 * Custom decks are reloaded for whoever uses the device afterwards (call
 * reloadCustomDecks() again once mbw_user is set).
 */
export function wipeAccountData(): void {
  for (const key of accountKeys()) localStorage.removeItem(key);
  useWorkoutStore.getState().reset();
  useWorkoutStore.setState({
    guestMode: false,
    savedWorkoutId: null,
    recordedWorkoutId: null,
  });
  reloadCustomDecks();
  queryClient.clear();
}

const isNative = Capacitor.isNativePlatform();

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
  await withinMs(
    Purchases.logIn({ appUserID: userId }).catch((err) =>
      console.warn("RevenueCat logIn failed:", err),
    ),
    4000,
  );
}

async function unlinkPurchases(): Promise<void> {
  if (!isNative) return;
  await withinMs(
    Purchases.logOut().catch(() => {
      // logOut throws when the current user is already anonymous.
    }),
    4000,
  );
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

export interface CompleteSignInOptions {
  /** True right after sign-up: data with no owner can't be this account's. */
  isNewAccount?: boolean;
  /** Runs after the device is marked as this account's, before the first
   * sync (sign-up copies guest progress across here so it is uploaded). */
  afterLocalSetup?: () => void;
}

/**
 * Finishes a sign-in or sign-up, before navigating:
 *  1. wipes another account's data (and ownerless data for a new account);
 *  2. marks the device as this account's (mbw_owner, mbw_user), leaves
 *     guest mode, and loads this account's custom decks;
 *  3. runs `afterLocalSetup`;
 *  4. links RevenueCat, then syncs onboarding answers and custom decks.
 * Waits at most a few seconds for the network; never throws.
 */
export async function completeSignIn(
  profile: unknown,
  options: CompleteSignInOptions = {},
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  bumpGeneration();
  // The in-progress workout and the web mock subscription have no guest
  // variant: what a guest left there is not this existing account's (a new
  // account takes guest progress over on purpose, see afterLocalSetup).
  if (useWorkoutStore.getState().guestMode && !options.isNewAccount) {
    useWorkoutStore.getState().reset();
    localStorage.removeItem("mbw_subscription");
  }
  if (userId) {
    const owner = localStorage.getItem(OWNER_KEY);
    if (owner !== userId && (owner !== null || options.isNewAccount)) {
      wipeAccountData();
    }
    localStorage.setItem(OWNER_KEY, userId);
  }
  // bigints in the profile serialise via the BigInt toJSON patch in main.tsx.
  localStorage.setItem("mbw_user", JSON.stringify(profile));
  useWorkoutStore.setState({ guestMode: false });
  options.afterLocalSetup?.();
  reloadCustomDecks();
  queryClient.clear();
  if (!userId) {
    resolvePurchasesReady();
    return;
  }
  await linkPurchases(userId);
  resolvePurchasesReady();
  // Keep the sign-in screen responsive on a bad connection: wait up to 5 s,
  // the rest of the sync finishes in the background.
  await withinMs(syncAccount(userId), 5000);
}

/**
 * Web only, in practice: when another tab of the same browser signs in, out,
 * or as someone else, this tab's in-memory state (decks, workout, query
 * cache) still belongs to the old account and would be written into the new
 * one. Stop all background syncs and reload so the tab starts from the
 * shared storage again. Returns an unsubscribe function.
 */
export function watchOtherTabs(): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.storageArea !== localStorage) return;
    const ownerChanged =
      event.key === OWNER_KEY && event.oldValue !== event.newValue;
    // mbw_user is also rewritten on profile edits: only signing in or out
    // (appearing / disappearing) matters.
    const signedInOrOut =
      event.key === "mbw_user" &&
      (event.oldValue === null) !== (event.newValue === null);
    if (event.key !== null && !ownerChanged && !signedInOrOut) return;
    bumpGeneration();
    window.location.reload();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
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
      reloadCustomDecks();
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

export interface SignOutOptions {
  /** Upload unsynced changes first (skip when the account was deleted). */
  flush?: boolean;
}

/**
 * Signs out on this device. First tries (for up to 4 s) to upload anything
 * not synced yet, then ends the Supabase session, logs RevenueCat out and
 * clears the in-progress workout and cached server data. The account's
 * local data stays, owned by the account (see the module comment).
 */
export async function signOut({ flush = true }: SignOutOptions = {}): Promise<void> {
  // The owner key says who is signed in without a network round trip (an
  // expired token would otherwise be refreshed first, which can take long).
  const owner = localStorage.getItem(OWNER_KEY);
  if (flush && owner && localStorage.getItem("mbw_user") !== null) {
    const scope = captureScope(owner);
    if (isScopeCurrent(scope)) {
      await withinMs(
        Promise.all([syncOnboardingWithServer(scope), pullCustomDecks(scope)]),
        4000,
      );
    }
  }
  bumpGeneration();
  await withinMs(
    supabase.auth.signOut({ scope: "local" }).catch((err) =>
      console.warn("Supabase signOut failed:", err),
    ),
    4000,
  );
  await unlinkPurchases();
  localStorage.removeItem("mbw_user");
  // The web-only mock subscription belongs to whoever bought it on this
  // browser session; never carry premium over to the next person.
  localStorage.removeItem("mbw_subscription");
  useWorkoutStore.getState().reset();
  useWorkoutStore.setState({ guestMode: false });
  reloadCustomDecks();
  queryClient.clear();
}
