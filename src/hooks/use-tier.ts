import {
  buildAchievementContext,
  queuePendingUnlockAnimations,
  reconcileAchievementsOnSubscribe,
} from "@/lib/achievementEngine";
import { ENTITLEMENT_ID, tierIdForProductId } from "@/lib/payments";
import { readStreak } from "@/lib/streak";
import { activateTrial, getTrialStatus, markTrialConverted } from "@/lib/trial";
import { useWorkoutStore } from "@/store/workout";
import type { SubscriptionTierId } from "@/types/subscription";
import type { TrialStatus } from "@/types/trial";
import { Capacitor } from "@capacitor/core";
import { type CustomerInfo, Purchases } from "@revenuecat/purchases-capacitor";
import { useCallback, useEffect, useState } from "react";

// `useAuth().userTier` (src/hooks/use-auth.ts) is a deliberate, unconditional
// "subscriber" dev-unlock so nothing in the rest of the app is gated on the
// draft — that's an existing decision, left untouched here. The streak
// calendar was the first feature that needed a real, live
// guest/registered/subscriber distinction, so this hook computes one
// locally.
//
// On a native build, subscriber status is the store's own truth: it's read
// from `Purchases.getCustomerInfo().entitlements` (see
// `subscriptionFromCustomerInfo` below), kept live via a
// CustomerInfoUpdateListener. In plain browser dev (`npm run dev`) there's
// no native billing runtime to query, so this falls back to the local
// `mbw_subscription` record written by the mock checkout flow on
// `/subscribe` — consistent with how registration/notifications/etc. are
// all faked locally in that build. See src/lib/payments.ts for the
// PaymentService side of this same native/mock split.
//
// Trial-day-count UX (the day-3 banner, the 14-day post-trial nudge window,
// pre-purchase "trial eligible" copy) stays on the local `mbw_trial` clock
// (src/lib/trial.ts) in both cases — that bookkeeping is presentational,
// not billing-authoritative, and RevenueCat's entitlement data doesn't
// cleanly provide day-by-day granularity anyway. It gates nothing: real
// access is always decided by `subscriber || trialActive` below, and
// `subscriber` alone already covers native trial periods (the store grants
// the entitlement for the trial's duration same as a paid period).
const SUBSCRIPTION_KEY = "mbw_subscription";
const isNative = Capacitor.isNativePlatform();

export interface SubscriptionRecord {
  tierId: SubscriptionTierId;
  purchasedAt: string;
  discountPct: number;
  startedTrial: boolean;
}

/** Web-dev-only fallback record — see the module comment above. */
export function readSubscription(): SubscriptionRecord | null {
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_KEY);
    return raw ? (JSON.parse(raw) as SubscriptionRecord) : null;
  } catch {
    return null;
  }
}

export function isSubscriber(): boolean {
  return readSubscription() !== null;
}

function subscriptionFromCustomerInfo(
  info: CustomerInfo,
): SubscriptionRecord | null {
  const entitlement = info.entitlements.active[ENTITLEMENT_ID];
  if (!entitlement) return null;
  return {
    tierId: tierIdForProductId(entitlement.productIdentifier) ?? "monthly",
    purchasedAt: entitlement.latestPurchaseDate,
    // RevenueCat doesn't expose which referral discount (if any) was
    // actually applied to a live purchase, so this can't be reconstructed
    // for a real subscriber the way the mock checkout records it.
    discountPct: 0,
    startedTrial: entitlement.periodType === "TRIAL",
  };
}

export function useTier() {
  const guestMode = useWorkoutStore((s) => s.guestMode);
  const isEmailAuth = localStorage.getItem("mbw_user") !== null;
  const isGuest = !isEmailAuth && guestMode;
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(
    () => (isNative ? null : readSubscription()),
  );
  const [trialStatus] = useState<TrialStatus>(() => getTrialStatus());

  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;
    const applyCustomerInfo = (info: CustomerInfo) => {
      if (!cancelled) setSubscription(subscriptionFromCustomerInfo(info));
    };

    Purchases.getCustomerInfo().then(({ customerInfo }) =>
      applyCustomerInfo(customerInfo),
    );

    let listenerId: string | undefined;
    Purchases.addCustomerInfoUpdateListener(applyCustomerInfo).then((id) => {
      listenerId = id;
    });

    return () => {
      cancelled = true;
      if (listenerId) {
        Purchases.removeCustomerInfoUpdateListener({
          listenerToRemove: listenerId,
        });
      }
    };
  }, []);

  const trialActive = trialStatus.kind === "active";
  const subscriber = subscription !== null;

  // "Real" tier — what the account actually is, ignoring any trial.
  const tier: AppTier = subscriber
    ? "subscriber"
    : isEmailAuth
      ? "registered"
      : "guest";

  // What the user actually gets access to right now — subscriber-level
  // during an active trial even though the underlying account is Registered.
  const effectiveTier: AppTier =
    subscriber || trialActive ? "subscriber" : tier;

  /** Completes checkout on `/subscribe` for a given tier + referral discount. Annual, trial-eligible purchases also (re)activate the trial rather than charging immediately — mirrors a real store's "starts with a free trial" purchase flow. */
  const purchase = useCallback(
    (tierId: SubscriptionTierId, discountPct: number, startTrial: boolean) => {
      if (startTrial) activateTrial();
      markTrialConverted();

      if (isNative) {
        // The store is the source of truth; the CustomerInfoUpdateListener
        // above will normally have already fired by the time
        // `paymentService.purchase()` resolves, but refresh once more here
        // so there's no stale-state flash before it does.
        Purchases.getCustomerInfo().then(({ customerInfo }) =>
          setSubscription(subscriptionFromCustomerInfo(customerInfo)),
        );
      } else {
        const record: SubscriptionRecord = {
          tierId,
          purchasedAt: new Date().toISOString(),
          discountPct,
          startedTrial: startTrial,
        };
        localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(record));
        setSubscription(record);
      }

      // Grant every achievement already earned but withheld pre-subscription
      // in one batch — the "almost unlocked" gold cards become real. The
      // next screen (Home) drains and animates the queue this leaves behind.
      const streak = readStreak(isGuest);
      const ctx = buildAchievementContext(isGuest, streak);
      const granted = reconcileAchievementsOnSubscribe(ctx);
      queuePendingUnlockAnimations(isGuest, granted);
    },
    [isGuest],
  );

  return {
    tier,
    effectiveTier,
    isSubscriber: subscriber,
    subscription,
    trialActive,
    trialStatus,
    purchase,
    guestMode: isGuest,
  };
}

export type AppTier = "guest" | "registered" | "subscriber";
