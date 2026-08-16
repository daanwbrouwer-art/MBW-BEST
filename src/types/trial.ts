export interface TrialData {
  active: boolean;
  /** ISO timestamp — when the trial was activated (registration moment). */
  startDate: string;
  /** ISO timestamp — startDate + 7 days. */
  endDate: string;
  /** True once the user subscribes, during or after the trial. */
  converted: boolean;
}

export type TrialStatus =
  | { kind: "none" }
  | { kind: "active"; daysLeft: number; dayNumber: number }
  | { kind: "expired"; daysSinceExpiry: number };

export interface TrialSummaryStats {
  cardsDrawn: number;
  workoutsCompleted: number;
  daysTrained: number;
  achievementsUnlocked: number;
}
