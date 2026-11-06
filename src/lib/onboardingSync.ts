// Keeps a signed-in user's onboarding answers on their account, so a new
// phone or a reinstall doesn't ask the questionnaire again, and an edit on
// one phone (Retake assessment, equipment) reaches the others.
//
// Each side carries an `updatedAt` stamp; syncing copies whichever side is
// newer. A push that failed offline leaves the device newer, so the next
// sync retries it.
//
// Body measurements (weight, height, age) never leave the device: the
// privacy policy promises that, and the server rejects them anyway (see the
// profiles_onboarding_shape check in 20261106130000).
//
// gender: the profile's own `gender` column is locked once set (it drives
// "same gender only" messaging, see profiles_guard_writes). The answer the
// user gave in the questionnaire, which picks the men's or women's decks,
// travels inside the onboarding JSON and is what devices use.
import { type AccountScope, isScopeCurrent } from "@/lib/accountScope";
import type { Json, TablesUpdate } from "@/lib/database.types";
import { supabase } from "@/lib/supabaseClient";
import type { OnboardingData } from "@/types/user";

export const USER_ONBOARDING_KEY = "mbw_onboarding";

const DEVICE_ONLY_FIELDS = ["weightKg", "heightCm", "age"] as const;

export function readLocalOnboarding(): OnboardingData | null {
  try {
    const raw = localStorage.getItem(USER_ONBOARDING_KEY);
    return raw ? (JSON.parse(raw) as OnboardingData) : null;
  } catch {
    return null;
  }
}

function writeLocalOnboarding(data: OnboardingData): void {
  localStorage.setItem(USER_ONBOARDING_KEY, JSON.stringify(data));
}

/** The answers as stored on the account: no body measurements. */
export function toServerOnboarding(
  data: OnboardingData,
): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...data };
  for (const field of DEVICE_ONLY_FIELDS) delete copy[field];
  delete copy.hasCompletedOnboarding;
  return copy;
}

/** When these answers were last changed (ms), for newest-wins syncing. */
export function onboardingStamp(
  data: Partial<OnboardingData> | null | undefined,
  fallbackIso?: string | null,
): number {
  if (!data) return 0;
  if (typeof data.updatedAt === "number") return data.updatedAt;
  if (typeof data.completedAt === "number") return data.completedAt;
  return fallbackIso ? new Date(fallbackIso).getTime() : 0;
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * Saves the answers to the signed-in account. Does nothing for guests or
 * when onboarding isn't finished yet (a half-done questionnaire stays local).
 */
export async function pushOnboarding(
  data: OnboardingData,
  userId?: string,
): Promise<void> {
  if (!data.hasCompletedOnboarding) return;
  const uid = userId ?? (await currentUserId());
  if (!uid) return;
  const completedAt = new Date(data.completedAt ?? Date.now()).toISOString();
  const update: TablesUpdate<"profiles"> = {
    onboarding: toServerOnboarding(data) as Json,
    onboarding_completed_at: completedAt,
  };
  // Fills in the profile's gender the first time; the server ignores later
  // changes (see the module comment).
  if (data.gender === "male" || data.gender === "female") {
    update.gender = data.gender;
  }
  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", uid);
  if (error) throw new Error(error.message);
}

/**
 * Reconciles this device with the account, newest side wins. A pull keeps
 * any body measurements this device already has. Writes nothing locally if
 * the device changed account while the request was in flight.
 */
export async function syncOnboardingWithServer(
  scope: AccountScope,
): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding, onboarding_completed_at, gender")
    .eq("id", scope.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!isScopeCurrent(scope)) return;

  const local = readLocalOnboarding();
  const localDone = !!local?.hasCompletedOnboarding;
  const server = (data?.onboarding ?? null) as Partial<OnboardingData> | null;
  const serverDone = !!data?.onboarding_completed_at && !!server;
  const serverStamp = onboardingStamp(server, data?.onboarding_completed_at);
  const localStamp = localDone ? onboardingStamp(local) : 0;

  if (serverDone && (!localDone || serverStamp > localStamp)) {
    const merged: OnboardingData = {
      ...server,
      gender: server.gender ?? data?.gender ?? local?.gender ?? "male",
      hasCompletedOnboarding: true,
      completedAt:
        server.completedAt ??
        new Date(data?.onboarding_completed_at as string).getTime(),
      updatedAt: serverStamp,
    };
    for (const field of DEVICE_ONLY_FIELDS) {
      if (local?.[field] !== undefined) {
        (merged as unknown as Record<string, unknown>)[field] = local[field];
      }
    }
    writeLocalOnboarding(merged);
    return;
  }

  if (localDone && local && (!serverDone || localStamp > serverStamp)) {
    await pushOnboarding(local, scope.userId);
  }
}
