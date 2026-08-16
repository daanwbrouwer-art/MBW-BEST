export type UserTier = "guest" | "registered" | "subscriber";

export interface EquipmentProfile {
  weightVest: boolean;
  resistanceBandLong: boolean;
  resistanceBandShort: boolean;
  rings: boolean;
}

export interface OnboardingData {
  gender: string;
  /** Vestigial — level selection was removed from onboarding. Kept for backend compatibility. */
  level?: string;
  hasCompletedOnboarding: boolean;
  /** Priority order, up to 3 — first entry is the user's top goal. */
  goals?: string[];
  /** 0-100 self-reported fitness level from the onboarding slider. */
  fitnessLevel?: number;
  /** Priority order, at least 1 — first entry is the user's primary equipment tier. */
  equipmentAccess?: string[];
  selfAssessment?: string;
  completedAt?: number;
  /** Which specific gear the user owns — drives card auto-substitution. */
  equipment?: EquipmentProfile;
  /** Body weight in kilograms, from the onboarding body-metrics step — feeds
   * the per-exercise calorie calculator (src/lib/calories.ts) so estimates
   * scale to the actual user instead of a flat assumed weight. */
  weightKg?: number;
  /** Age in years, from the onboarding body-metrics step — applies a mild
   * adjustment to the calorie calculator (metabolic rate softens with age). */
  age?: number;
  /** Height in centimeters, from the onboarding body-metrics step — combined
   * with weightKg to derive BMI, which feeds a mild adjustment into the
   * calorie calculator (src/lib/calories.ts). */
  heightCm?: number;
}
