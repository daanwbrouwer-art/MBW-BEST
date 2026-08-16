import { useInternetIdentity } from "@/hooks/use-local-identity";
import { useWorkoutStore } from "@/store/workout";
import type { EquipmentProfile, OnboardingData } from "@/types/user";
import { useCallback, useEffect, useState } from "react";

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

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<OnboardingData | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const stored = readOnboarding(isGuest);
    setData(stored);
    setIsLoading(false);
  }, [isGuest]);

  // Merges a partial patch into the stored onboarding data instead of
  // replacing it wholesale — each step of the multi-screen flow saves just
  // its own field, and only the final step's patch includes
  // hasCompletedOnboarding: true. That way abandoning the flow partway
  // through correctly leaves the user un-onboarded next time they return.
  const saveOnboarding = useCallback(
    async (patch: Partial<OnboardingData>) => {
      const base: OnboardingData = data ?? {
        gender: "male",
        hasCompletedOnboarding: false,
      };
      const updated: OnboardingData = { ...base, ...patch };
      writeOnboarding(isGuest, updated);
      setData(updated);
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
