import type { AppTier } from "@/hooks/use-tier";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";

const TEAL = "#1AD6A0";
const ORANGE = "#f59e0b";
const RED = "#ef4444";

/** Weekly card-usage bar + tier-specific nudges — never rendered for subscribers (unlimited, no banners). */
export function UsageIndicator({
  tier,
  cardsUsed,
  limit,
}: {
  tier: Exclude<AppTier, "subscriber">;
  cardsUsed: number;
  limit: number;
}) {
  const navigate = useNavigate();
  const pct = limit > 0 ? Math.min(100, (cardsUsed / limit) * 100) : 0;
  const atLimit = cardsUsed >= limit;
  const barColor = atLimit ? RED : pct > 75 ? ORANGE : TEAL;
  const remaining = Math.max(0, limit - cardsUsed);
  const showRemainingCounter = tier === "registered" && !atLimit && cardsUsed >= 15;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-5 mb-4"
      data-ocid="home.usage_indicator"
    >
      {tier === "guest" && (
        <div
          className="rounded-2xl px-4 py-3.5 mb-3 flex items-center justify-between gap-3"
          style={{
            background: "oklch(0.17 0.015 180 / 0.3)",
            border: "1px solid oklch(0.68 0.25 180 / 0.3)",
          }}
          data-ocid="home.guest_signup_banner"
        >
          <p className="text-xs text-white font-body leading-snug flex-1">
            Sign up free to unlock 20 cards/week and save your progress →
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/onboarding/create-account" })}
            className="shrink-0 px-3.5 h-8 rounded-full font-display font-bold text-[11px] tracking-wide transition-smooth hover:opacity-90 active:scale-[0.98]"
            style={{ background: TEAL, color: "oklch(0.08 0.005 260)" }}
            data-ocid="home.guest_signup_banner.cta"
          >
            Sign Up Free
          </button>
        </div>
      )}

      <div
        className="rounded-2xl px-4 py-3"
        style={{
          background: "oklch(0.16 0.01 260)",
          border: "1px solid oklch(0.26 0.01 260 / 0.5)",
        }}
      >
        <div
          className="w-full h-1.5 rounded-full overflow-hidden mb-2"
          style={{ background: "oklch(0.22 0.012 260)" }}
        >
          <motion.div
            className="h-full rounded-full"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: barColor, boxShadow: `0 0 6px ${barColor}` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span
            className="text-xs font-body"
            style={{ color: atLimit ? RED : "oklch(0.6 0.008 260)" }}
            data-ocid="home.usage_indicator.text"
          >
            {atLimit
              ? "Weekly limit reached — resets Monday"
              : `${cardsUsed} / ${limit} cards used this week`}
          </span>
          {showRemainingCounter && (
            <span
              className="text-xs font-display font-bold"
              style={{ color: TEAL }}
              data-ocid="home.usage_indicator.remaining"
            >
              {remaining} {remaining === 1 ? "card" : "cards"} remaining this
              week
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
