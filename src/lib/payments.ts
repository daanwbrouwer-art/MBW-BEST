import type { SubscriptionTierId } from "@/types/subscription";
import { Capacitor } from "@capacitor/core";
import {
  PURCHASES_ERROR_CODE,
  Purchases,
  type PurchasesOffering,
  type PurchasesPackage,
} from "@revenuecat/purchases-capacitor";

// ─── Payment integration seam ──────────────────────────────────────────────
//
// Real digital-subscription billing on mobile goes through Apple's
// StoreKit / Google Play Billing, wrapped here by RevenueCat's SDK
// (`@revenuecat/purchases-capacitor`). `RevenueCatPaymentService` below is
// the live implementation, wired up in native (iOS/Android) builds via
// `Capacitor.isNativePlatform()`. `LocalMockPaymentService` remains as the
// fallback for plain browser dev (`npm run dev`), which has no native
// billing runtime to talk to.
//
// Product/entitlement identifiers below (`TIER_PRODUCT_IDS`,
// `ENTITLEMENT_ID`) are final. What's still outstanding is store-side setup
// that can't be done from inside this repo: creating the three subscription
// products under these exact identifiers in App Store Connect and Google
// Play Console, the 7-day free Introductory Offer on the Annual product
// (store-managed — see `hasTrial` on the Annual tier in
// `src/types/subscription.ts`), the 20%-off-first-3-months Founding Member
// Introductory Offer on the Monthly product, and the RevenueCat project
// itself (Offering + Entitlement + the Monthly/Three Month/Annual packages
// attached to it). Once that's live, set `VITE_REVENUECAT_IOS_API_KEY` /
// `VITE_REVENUECAT_ANDROID_API_KEY` in the native build environment (see
// `src/main.tsx`) with the RevenueCat project's public SDK keys.
//
// Both the Annual trial and the Monthly Founding Member discount are
// store-managed Introductory Offers — RevenueCat applies the correct price
// automatically on `purchasePackage()` for an eligible customer, so neither
// needs client-side price/discount logic at purchase time. (`SubscribePage`
// still displays the flat, non-discounted price ahead of purchase since it
// reads off the hardcoded `SUBSCRIPTION_TIERS` rather than live per-customer
// intro-offer eligibility from RevenueCat — showing the real Founding
// Member price pre-purchase is a legitimate follow-up, not done here.)
//
// Referral discount (`options.discountPct` below): deliberately NOT wired
// to real purchases. A client-computed percentage can't be applied to a
// real Apple/Google purchase directly — that needs a pre-approved
// Promotional Offer (iOS) / offer code with a Base Plan discount (Android),
// signed server-side and applied by identifier. Scoping that is a later
// pass. Until then the referral discount stays cosmetic — shown in the UI
// (`SubscribePage`'s discount banner/strikethrough) but ignored by
// `RevenueCatPaymentService.purchase` below, same as `startTrial` (trial
// eligibility is store-determined, not client-asserted).

export interface PurchaseResult {
  success: boolean;
  error?: string;
  /**
   * True when the user dismissed the store's purchase sheet rather than an
   * actual failure. `SubscribePage` doesn't currently branch on this (it
   * shows the same "Purchase failed" toast either way, same as before this
   * integration existed) — but the field is here so it can start doing that
   * without another change to this file.
   */
  cancelled?: boolean;
}

export interface PaymentService {
  purchase(
    tierId: SubscriptionTierId,
    options: { discountPct: number; startTrial: boolean },
  ): Promise<PurchaseResult>;
  restorePurchases(): Promise<PurchaseResult>;
}

class LocalMockPaymentService implements PaymentService {
  async purchase(): Promise<PurchaseResult> {
    // Simulates the round-trip to the platform billing sheet + RevenueCat
    // receipt validation. Always succeeds locally — there's no real charge,
    // no real store, and nothing to fail against.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true };
  }

  async restorePurchases(): Promise<PurchaseResult> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { success: true };
  }
}

/**
 * The Entitlement identifier configured in the RevenueCat dashboard that
 * gates subscriber-only access in this app — granted by all three tiers.
 * Create the Entitlement in RevenueCat under this exact identifier.
 * Also used by `useTier()` (src/hooks/use-tier.ts) to read
 * `CustomerInfo.entitlements`.
 */
export const ENTITLEMENT_ID = "premium";

/**
 * The live App Store Connect / Google Play Console subscription product
 * identifier behind each tier — the same identifier string on both stores
 * (reverse-DNS, matching the app's bundle id `com.mybodyweight.app`), which
 * keeps `tierIdForProductId` below platform-agnostic instead of needing a
 * separate id per platform. Used to interpret
 * `CustomerInfo.entitlements[...].productIdentifier` back into a tier id
 * (see `tierIdForProductId`, used by `useTier()`).
 *
 * Purchasing itself (`packageForTier` below) doesn't need these: it reads
 * the current Offering's predefined Monthly/Three Month/Annual package
 * slots directly, which RevenueCat populates from whichever product is
 * attached in the dashboard regardless of the product's raw identifier.
 *
 * Create these three products under these exact identifiers in both App
 * Store Connect and Google Play Console, then attach each to the matching
 * Monthly/Three Month/Annual package in the RevenueCat Offering (use
 * RevenueCat's standard duration package types, not a custom package — the
 * SDK's `offering.monthly` / `.threeMonth` / `.annual` getters used by
 * `packageForTier` below only populate for those standard types).
 */
export const TIER_PRODUCT_IDS: Record<SubscriptionTierId, string> = {
  monthly: "com.mybodyweight.app.monthly",
  quarterly: "com.mybodyweight.app.quarterly",
  annual: "com.mybodyweight.app.annual",
};

export function tierIdForProductId(
  productId: string,
): SubscriptionTierId | null {
  const entry = (
    Object.entries(TIER_PRODUCT_IDS) as [SubscriptionTierId, string][]
  ).find(([, id]) => id === productId);
  return entry ? entry[0] : null;
}

function packageForTier(
  offering: PurchasesOffering | null,
  tierId: SubscriptionTierId,
): PurchasesPackage | null {
  if (!offering) return null;
  switch (tierId) {
    case "monthly":
      return offering.monthly;
    case "quarterly":
      return offering.threeMonth;
    case "annual":
      return offering.annual;
  }
}

/**
 * Live RevenueCat offering, for any UI that currently reads pricing off the
 * hardcoded `SUBSCRIPTION_TIERS` (src/types/subscription.ts) — that's still
 * how `SubscribePage`/`PaywallModal` render prices today. Swapping them to
 * this (store-localized currency/pricing, which can differ from the
 * hardcoded EUR figures) is a follow-up, not done here since those pages
 * shouldn't need changes for this integration itself.
 *
 * Returns `null` outside a native build — there's no live offering to fetch
 * in plain browser dev.
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const { current } = await Purchases.getOfferings();
  return current;
}

class RevenueCatPaymentService implements PaymentService {
  async purchase(
    tierId: SubscriptionTierId,
    _options: { discountPct: number; startTrial: boolean },
  ): Promise<PurchaseResult> {
    try {
      const offering = await getOfferings();
      const pkg = packageForTier(offering, tierId);
      if (!pkg) {
        return {
          success: false,
          error: `No RevenueCat package configured for the "${tierId}" plan yet.`,
        };
      }
      await Purchases.purchasePackage({ aPackage: pkg });
      return { success: true };
    } catch (e) {
      const err = e as {
        code?: string;
        message?: string;
        userCancelled?: boolean;
      };
      if (
        err.userCancelled ||
        err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
      ) {
        return { success: false, cancelled: true };
      }
      return {
        success: false,
        error: err.message ?? "Purchase failed. Please try again.",
      };
    }
  }

  async restorePurchases(): Promise<PurchaseResult> {
    try {
      await Purchases.restorePurchases();
      return { success: true };
    } catch (e) {
      const err = e as { message?: string };
      return {
        success: false,
        error: err.message ?? "Restore failed. Please try again.",
      };
    }
  }
}

export const paymentService: PaymentService = Capacitor.isNativePlatform()
  ? new RevenueCatPaymentService()
  : new LocalMockPaymentService();
