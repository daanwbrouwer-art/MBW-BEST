import { Logo } from "@/components/Logo";
import { useTier } from "@/hooks/use-tier";
import { openPrivacyPolicy, openTermsOfUse } from "@/lib/legal";
import { paymentService } from "@/lib/payments";
import {
  computeDiscountPct,
  ensureReferralCode,
  getCurrentEmail,
  getReferralRecord,
  markFirstPaymentDiscountUsed,
} from "@/lib/referral";
import { hasEverHadTrial } from "@/lib/trial";
import {
  ANNUAL_TIER,
  MONTHLY_TIER,
  SUBSCRIPTION_TIERS,
  type SubscriptionTier,
  type SubscriptionTierId,
  applyDiscount,
  formatEUR,
  monthlyEquivalentTotal,
  weeklyPrice,
} from "@/types/subscription";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/** "Apple ID account" on iOS, "Google Play account" everywhere else (including
 * plain browser dev, which has no real store to reference anyway) — matches
 * Apple's own required auto-renewing-subscription disclosure wording
 * (Guideline 3.1.2) exactly rather than a generic "app store account" phrase. */
const storeAccountLabel =
  Capacitor.getPlatform() === "ios"
    ? "Apple ID account"
    : "Google Play account";

const TEAL = "oklch(0.68 0.25 180)";

export default function SubscribePage() {
  const navigate = useNavigate();
  const { purchase } = useTier();
  const [selectedTierId, setSelectedTierId] = useState<SubscriptionTierId>(
    ANNUAL_TIER.id,
  );
  const [isPurchasing, setIsPurchasing] = useState(false);

  const email = getCurrentEmail();
  const referral = email ? getReferralRecord(email) : null;
  const discountPct = computeDiscountPct(referral);

  const trialEligible = !hasEverHadTrial();
  const selectedTier = SUBSCRIPTION_TIERS.find((t) => t.id === selectedTierId)!;
  const showTrial = selectedTier.hasTrial && trialEligible;

  const discountedPrice = useMemo(
    () => applyDiscount(selectedTier.price, discountPct),
    [selectedTier, discountPct],
  );

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      const result = await paymentService.purchase(selectedTierId, {
        discountPct,
        startTrial: showTrial,
      });
      if (result.success) {
        purchase(selectedTierId, discountPct, showTrial);
        if (email) {
          ensureReferralCode(email);
          if (discountPct > 0) markFirstPaymentDiscountUsed(email);
        }
        toast(
          showTrial ? "Your free trial has started!" : "You're subscribed!",
          {
            description: showTrial
              ? `Full access for 7 days, then ${formatEUR(discountedPrice)}/year.`
              : `Welcome to MyBodyWeight ${selectedTier.label}.`,
            duration: 4500,
          },
        );
        navigate({ to: "/home" });
      } else {
        toast("Purchase failed", {
          description: result.error ?? "Please try again.",
          duration: 4000,
        });
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div
      className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto"
      data-ocid="subscribe.page"
    >
      <div
        className="pointer-events-none fixed inset-0 max-w-[430px] mx-auto"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.22 0.04 180 / 0.22) 0%, transparent 65%)",
        }}
      />

      <header className="relative flex items-center gap-3 px-5 pt-12 pb-4">
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          className="w-10 h-10 rounded-xl bg-card border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/45 transition-smooth"
          data-ocid="subscribe.back_button"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Logo size="sm" iconOnly className="opacity-70" />
      </header>

      <div className="relative flex-1 px-5 pb-10 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="font-display font-black text-2xl text-foreground leading-tight">
            Unlock full access
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1.5 leading-relaxed">
            Unlimited cards, every Pro deck, achievements, and your full streak
            history.
          </p>
        </motion.div>

        {discountPct > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl px-4 py-3 mb-5 flex items-center gap-2.5"
            style={{
              background: "oklch(0.17 0.04 180 / 0.3)",
              border: "1px solid oklch(0.68 0.25 180 / 0.35)",
            }}
            data-ocid="subscribe.referral_banner"
          >
            <Sparkles className="w-4 h-4 shrink-0" style={{ color: TEAL }} />
            <p className="text-xs text-foreground font-body leading-snug">
              Your referral discount:{" "}
              <span className="font-display font-bold" style={{ color: TEAL }}>
                {discountPct}% off
              </span>{" "}
              is applied below.
            </p>
          </motion.div>
        )}

        <div className="flex flex-col gap-3 mb-6">
          {SUBSCRIPTION_TIERS.map((tier, i) => (
            <PlanCard
              key={tier.id}
              tier={tier}
              index={i}
              selected={tier.id === selectedTierId}
              trialEligible={trialEligible}
              onSelect={() => setSelectedTierId(tier.id)}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 mb-5"
          style={{
            background: "oklch(0.16 0.01 260)",
            border: "1px solid oklch(0.26 0.01 260 / 0.5)",
          }}
          data-ocid="subscribe.summary"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground font-body">
              {selectedTier.label} plan
            </span>
            <span className="text-sm text-muted-foreground font-body tabular-nums">
              {discountPct > 0 ? (
                <>
                  <span className="line-through opacity-50 mr-1.5">
                    {formatEUR(selectedTier.price)}
                  </span>
                  {formatEUR(discountedPrice)}
                </>
              ) : (
                formatEUR(selectedTier.price)
              )}
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-body">
            {selectedTier.billingPeriodLabel}
            {discountPct > 0 && ` · ${discountPct}% referral discount applied`}
          </p>
        </motion.div>

        <motion.button
          type="button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handlePurchase}
          disabled={isPurchasing}
          className="w-full h-14 rounded-full flex items-center justify-center font-display font-bold text-sm tracking-wide bg-primary text-background transition-smooth hover:opacity-90 active:scale-[0.98] disabled:opacity-60 mb-3"
          data-ocid="subscribe.purchase_button"
        >
          {isPurchasing ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              Processing...
            </span>
          ) : showTrial ? (
            "Start 7-day free trial"
          ) : (
            `Subscribe — ${formatEUR(discountedPrice)}`
          )}
        </motion.button>

        {showTrial && (
          <p className="text-center text-xs text-muted-foreground font-body mb-3">
            Free for 7 days, then {formatEUR(discountedPrice)}/year. Cancel
            anytime.
          </p>
        )}

        <p className="text-center text-[11px] text-muted-foreground/70 font-body leading-relaxed">
          Payment will be charged to your {storeAccountLabel} at confirmation of
          purchase. Subscriptions automatically renew unless auto-renew is
          turned off at least 24 hours before the end of the current period —
          your account will be charged for renewal within 24 hours prior to the
          end of the current period. Subscriptions may be managed by you, and
          auto-renewal may be turned off, by going to your account settings
          after purchase.
        </p>
        <p className="text-center text-[11px] text-muted-foreground/70 font-body mt-2">
          <button
            type="button"
            onClick={openTermsOfUse}
            className="underline hover:text-muted-foreground transition-smooth"
            data-ocid="subscribe.terms_link"
          >
            Terms of Use
          </button>
          {" · "}
          <button
            type="button"
            onClick={openPrivacyPolicy}
            className="underline hover:text-muted-foreground transition-smooth"
            data-ocid="subscribe.privacy_link"
          >
            Privacy Policy
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Plan card ──────────────────────────────────────────────────────────────

function PlanCard({
  tier,
  index,
  selected,
  trialEligible,
  onSelect,
}: {
  tier: SubscriptionTier;
  index: number;
  selected: boolean;
  trialEligible: boolean;
  onSelect: () => void;
}) {
  const isAnnual = tier.id === ANNUAL_TIER.id;
  const isMonthly = tier.id === MONTHLY_TIER.id;
  const showTrialTag = isAnnual && trialEligible;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.06, duration: 0.35 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="relative w-full rounded-3xl border text-left transition-smooth overflow-hidden"
      style={{
        background: isAnnual
          ? "oklch(0.17 0.03 180 / 0.4)"
          : "oklch(0.16 0.012 260)",
        borderColor: selected
          ? isAnnual
            ? "oklch(0.68 0.25 180 / 0.85)"
            : "oklch(0.68 0.25 180 / 0.5)"
          : "oklch(0.26 0.01 260 / 0.5)",
        boxShadow: isAnnual
          ? selected
            ? "0 0 32px oklch(0.68 0.25 180 / 0.4), 0 4px 20px oklch(0 0 0 / 0.3)"
            : "0 0 20px oklch(0.68 0.25 180 / 0.18)"
          : selected
            ? "0 0 16px oklch(0.68 0.25 180 / 0.18)"
            : "none",
      }}
      data-ocid={`subscribe.plan_card.${tier.id}`}
    >
      {isAnnual && (
        <div
          className="px-4 py-1.5 flex items-center justify-between"
          style={{ background: "oklch(0.68 0.25 180 / 0.18)" }}
        >
          <span
            className="text-[10px] font-display font-black uppercase tracking-widest"
            style={{ color: TEAL }}
          >
            ⭐ Best Value
          </span>
          <span
            className="text-[10px] font-display font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: TEAL, color: "oklch(0.1 0.01 260)" }}
          >
            Save {tier.savingsVsMonthlyPct}%
          </span>
        </div>
      )}

      <div className="p-4 flex items-center gap-3">
        {/* Selection indicator */}
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: selected ? TEAL : "transparent",
            border: selected ? "none" : "1.5px solid oklch(0.4 0.01 260)",
          }}
        >
          {selected && (
            <Check
              className="w-3 h-3"
              style={{ color: "oklch(0.08 0.005 260)" }}
              strokeWidth={3}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-display font-black text-base text-white">
              {tier.label}
            </h3>
            {!isAnnual && tier.savingsVsMonthlyPct > 0 && (
              <span
                className="text-[9px] font-display font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                style={{
                  background: "oklch(0.68 0.25 180 / 0.15)",
                  color: TEAL,
                }}
              >
                Save {tier.savingsVsMonthlyPct}%
              </span>
            )}
            {showTrialTag && (
              <span
                className="text-[9px] font-display font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                style={{
                  background: "oklch(0.72 0.18 60 / 0.18)",
                  color: "oklch(0.78 0.18 60)",
                }}
              >
                7-day trial
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2 flex-wrap">
            {isAnnual && (
              <span className="text-xs text-muted-foreground/60 font-body line-through">
                {formatEUR(monthlyEquivalentTotal(tier))}
              </span>
            )}
            <span className="font-display font-black text-lg text-white">
              {formatEUR(tier.price)}
            </span>
            <span className="text-xs text-muted-foreground font-body">
              {tier.billingPeriodLabel}
            </span>
          </div>

          {!isMonthly && (
            <p className="text-[11px] text-muted-foreground/80 font-body mt-0.5">
              ≈ {formatEUR(tier.perMonthEquivalent)}/month
              {isAnnual && ` · just ${formatEUR(weeklyPrice(tier))}/week`}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
}
