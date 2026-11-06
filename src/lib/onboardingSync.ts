// Keeps a signed-in user's onboarding answers on their account, so a new
// phone or a reinstall doesn't ask the questionnaire again.
//
// Body measurements (weight, height, age) never leave the device: the
// privacy policy promises that, and the server rejects them anyway (see the
// profiles_onboarding_shape check in 20261106130000).
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
  // gender is locked server-side once set (profiles_guard_writes), so this
  // only fills it in when it is still empty.
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
 * Reconciles this device with the account:
 *  - finished on the account but not here: copy the answers down (keeping
 *    any body measurements this device already has);
 *  - finished here but not on the account: copy them up.
 */
export async function syncOnboardingWithServer(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding, onboarding_completed_at, gender")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const local = readLocalOnboarding();
  const serverDone = !!data?.onboarding_completed_at && !!data.onboarding;

  if (serverDone && !local?.hasCompletedOnboarding) {
    const server = data.onboarding as Partial<OnboardingData>;
    const merged: OnboardingData = {
      ...server,
      gender: data.gender ?? server.gender ?? local?.gender ?? "male",
      hasCompletedOnboarding: true,
      completedAt:
        server.completedAt ?? new Date(data.onboarding_completed_at!).getTime(),
    };
    for (const field of DEVICE_ONLY_FIELDS) {
      if (local?.[field] !== undefined) {
        (merged as unknown as Record<string, unknown>)[field] = local[field];
      }
    }
    writeLocalOnboarding(merged);
    return;
  }

  if (!serverDone && local?.hasCompletedOnboarding) {
    await pushOnboarding(local, userId);
  }
}
