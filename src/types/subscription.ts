export type SubscriptionTierId = "monthly" | "quarterly" | "annual";

export interface SubscriptionTier {
  id: SubscriptionTierId;
  label: string;
  /** EUR, the amount actually billed for this period (before any discount). */
  price: number;
  billingPeriodLabel: string;
  /** EUR, price divided evenly across the months it covers — for comparison, not what's billed. */
  perMonthEquivalent: number;
  /** vs. paying the Monthly plan for the same number of months, 0 for Monthly itself. */
  savingsVsMonthlyPct: number;
  hasTrial: boolean;
}

// Charm pricing, entered literally — never derive/round these from each other.
export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: "monthly",
    label: "Monthly",
    price: 5.99,
    billingPeriodLabel: "billed monthly",
    perMonthEquivalent: 5.99,
    savingsVsMonthlyPct: 0,
    hasTrial: false,
  },
  {
    id: "quarterly",
    label: "3-Month",
    price: 14.99,
    billingPeriodLabel: "billed every 3 months",
    perMonthEquivalent: 5.0,
    savingsVsMonthlyPct: 17,
    hasTrial: false,
  },
  {
    id: "annual",
    label: "Annual",
    price: 47.99,
    billingPeriodLabel: "billed annually",
    perMonthEquivalent: 4.0,
    savingsVsMonthlyPct: 33,
    hasTrial: true,
  },
];

export const MONTHLY_TIER = SUBSCRIPTION_TIERS[0];
export const ANNUAL_TIER = SUBSCRIPTION_TIERS[2];

const MONTHS_BY_TIER: Record<SubscriptionTierId, number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
};

export function getTier(id: SubscriptionTierId): SubscriptionTier {
  const tier = SUBSCRIPTION_TIERS.find((t) => t.id === id);
  if (!tier) throw new Error(`Unknown subscription tier: ${id}`);
  return tier;
}

/** What the same number of months would cost on the Monthly plan — the strikethrough comparison price. */
export function monthlyEquivalentTotal(tier: SubscriptionTier): number {
  return MONTHLY_TIER.price * MONTHS_BY_TIER[tier.id];
}

export function weeklyPrice(tier: SubscriptionTier): number {
  return tier.price / (MONTHS_BY_TIER[tier.id] * 4.345);
}

export function formatEUR(amount: number): string {
  return `€${amount.toFixed(2)}`;
}

/** Applies a percentage discount (0-100) to a tier's billed price. */
export function applyDiscount(price: number, discountPct: number): number {
  return price * (1 - discountPct / 100);
}
