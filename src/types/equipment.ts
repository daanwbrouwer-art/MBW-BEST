// Equipment-based recommendation system — see
// MBW-equipment-recommendation-system-2026-08-07.md (Parts 3-5) for the
// design. Suggestions are informational only: they never change the card's
// actual exercise, rep count, or workout logic.

export type EquipmentType = "elastic" | "parallel_bars" | "vest" | "rings";
export type EquipmentTier = "bodyweight" | "basic" | "advanced";
export type Direction = "easier" | "harder" | "enables";

export interface EquipmentSuggestion {
  equipment: EquipmentType;
  direction: Direction;
  /** Short chip text, ~20-30 chars max. */
  label: string;
}

/** Which equipment each tier includes. */
export const TIER_INCLUDES: Record<EquipmentTier, EquipmentType[]> = {
  bodyweight: [],
  basic: ["elastic", "parallel_bars"],
  advanced: ["elastic", "parallel_bars", "vest", "rings"],
};
