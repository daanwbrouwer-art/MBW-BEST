import { useInternetIdentity } from "@/hooks/use-local-identity";
import {
  DEVICE_ONLY_FIELDS,
  ONBOARDING_PULLED_EVENT,
  pushOnboarding,
} from "@/lib/onboardingSync";
import { useWorkoutStore } from "@/store/workout";
import type { EquipmentProfile, OnboardingData } from "@/types/user";
import { useCallback, useEffect, useRef, useState } from "react";

const GUEST_ONBOARDING_KEY = "mbw_guest_onboarding";
const USER_ONBOARDING_KEY = "mbw_onboarding";

export const DEFAULT_EQUIPMENT: EquipmentProfile = {
  weightVest: false,
  resistanceBandLong: false,
  resistanceBandShort: false,
  rings: false,
};

function readOnboarding(isGuest: boolean): OnboardingData | null {
  const key = isGuest ? GUEST_ONBOARDING_KEY : USER_ONBOARDING_KEY;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingData;
  } catch {
    return null;
  }
}

function writeOnboarding(isGuest: boolean, data: OnboardingData): void {
  const key = isGuest ? GUEST_ONBOARDING_KEY : USER_ONBOARDING_KEY;
  localStorage.setItem(key, JSON.stringify(data));
}

export function useOnboarding() {
  const { loginStatus } = useInternetIdentity();
  const guestMode = useWorkoutStore((s) => s.guestMode);
  const isEmailAuth = localStorage.getItem("mbw_user") !== null;
  const isAuthenticated = loginStatus === "success" || isEmailAuth;
  const isGuest = guestMode && !isAuthenticated;

  // localStorage is synchronous, so read it during the first render. There
  // used to be a one-render "loading" gap, during which OnboardingGuard
  // briefly rendered protected pages for users who hadn't finished
  // onboarding (that flash caused a render loop on /workout/session).
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<OnboardingData | null>(() =>
    readOnboarding(isGuest),
  );

  // Re-read when switching between guest and account storage.
  const lastIsGuest = useRef(isGuest);
  useEffect(() => {
    if (lastIsGuest.current === isGuest) return;
    lastIsGuest.current = isGuest;
    setIsLoading(true);
    setData(readOnboarding(isGuest));
    setIsLoading(false);
  }, [isGuest]);

  // A background sync pulled the account's answers: show them.
  useEffect(() => {
    if (isGuest) return;
    const onPulled = () => setData(readOnboarding(false));
    window.addEventListener(ONBOARDING_PULLED_EVENT, onPulled);
    return () => window.removeEventListener(ONBOARDING_PULLED_EVENT, onPulled);
  }, [isGuest]);

  // Merges a partial patch into the stored onboarding data instead of
  // replacing it wholesale — each step of the multi-screen flow saves just
  // its own field, and only the final step's patch includes
  // hasCompletedOnboarding: true. That way abandoning the flow partway
  // through correctly leaves the user un-onboarded next time they return.
  const saveOnboarding = useCallback(
    async (patch: Partial<OnboardingData>) => {
      // Build on what is stored now, not this component's copy: a background
      // sync may have written newer answers since it mounted.
      const base: OnboardingData = readOnboarding(isGuest) ??
        data ?? {
          gender: "male",
          hasCompletedOnboarding: false,
        };
      // Weight, height and age never leave the device, so changing only
      // those must not stamp the shared answers as newer (that would let
      // this device's possibly stale goals/equipment overwrite another
      // device's newer ones on the next sync).
      const deviceOnly = Object.keys(patch).every((k) =>
        (DEVICE_ONLY_FIELDS as readonly string[]).includes(k),
      );
      const updated: OnboardingData = {
        ...base,
        ...patch,
        updatedAt: deviceOnly ? base.updatedAt : Date.now(),
      };
      writeOnboarding(isGuest, updated);
      setData(updated);
      // Signed-in users keep their answers on the account (minus body
      // measurements), so a new phone doesn't ask again.
      if (!isGuest && !deviceOnly) {
        pushOnboarding(updated).catch((err) =>
          console.warn("Couldn't save onboarding to the account:", err),
        );
      }
    },
    [isGuest, data],
  );

  return {
    hasCompletedOnboarding: data?.hasCompletedOnboarding ?? false,
    gender: (data?.gender ?? "male") as "male" | "female",
    level: data?.level ?? null,
    goals: data?.goals ?? [],
    fitnessLevel: data?.fitnessLevel ?? null,
    equipmentAccess: data?.equipmentAccess ?? [],
    selfAssessment: data?.selfAssessment ?? null,
    equipment: data?.equipment ?? DEFAULT_EQUIPMENT,
    weightKg: data?.weightKg ?? null,
    age: data?.age ?? null,
    heightCm: data?.heightCm ?? null,
    saveOnboarding,
    isLoading,
  };
}
