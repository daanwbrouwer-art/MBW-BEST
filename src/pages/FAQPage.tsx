import { Logo } from "@/components/Logo";
import { RESTORE_PURCHASES_ANCHOR_ID } from "@/pages/ProfilePage";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { motion } from "motion/react";

// Static help content — no search, no CMS, deliberately just a handful of
// entries. New entries should only be added here once the behavior they
// describe has actually shipped (see the "reinstalled the app" entry, which
// only promises what streaks/achievements/history actually do today — not
// what a future server-sync pass might do).

export default function FAQPage() {
  const navigate = useNavigate();

  const handleGoToRestorePurchases = () => {
    navigate({ to: "/profile", hash: RESTORE_PURCHASES_ANCHOR_ID });
  };

  return (
    <div
      className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto relative"
      data-ocid="faq.page"
    >
      <div
        className="absolute inset-0 pointer-events-none max-w-[430px] mx-auto"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.22 0.04 180 / 0.22) 0%, transparent 60%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4">
        <button
          type="button"
          className="w-9 h-9 rounded-xl bg-card/80 border border-border/60 flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-smooth"
          onClick={() => navigate({ to: "/profile" })}
          data-ocid="faq.back_button"
          aria-label="Go back to profile"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Logo size="sm" showIcon />
        <div className="w-9" />
      </header>

      <div className="relative z-10 flex flex-col flex-1 px-5 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="pt-2 pb-6"
        >
          <h1 className="font-display font-black text-2xl text-foreground mb-1">
            FAQ &amp; Troubleshooting
          </h1>
          <p className="text-xs text-muted-foreground font-body">
            Answers to the most common questions.
          </p>
        </motion.div>

        <div className="flex flex-col gap-3">
          {/* Streak reset */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4 }}
            className="rounded-2xl p-4"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.5)",
            }}
            data-ocid="faq.item.streak_reset"
          >
            <p className="font-display font-bold text-sm text-foreground mb-1.5">
              Why did my streak reset?
            </p>
            <p className="text-xs text-muted-foreground font-body leading-relaxed">
              Your streak counts consecutive weeks where you hit your weekly
              training-day goal (set in your Training Goal, above). If a full
              week goes by without meeting that goal, your streak resets to zero
              for the next week — there's currently no grace period for a missed
              week. If your goal feels like a stretch, lowering it (e.g. from 5
              days to 3) makes the streak easier to keep alive.
            </p>
          </motion.div>

          {/* Reinstall / lost progress */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="rounded-2xl p-4"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.5)",
            }}
            data-ocid="faq.item.reinstalled"
          >
            <p className="font-display font-bold text-sm text-foreground mb-1.5">
              I reinstalled the app and lost my progress.
            </p>
            <p className="text-xs text-muted-foreground font-body leading-relaxed mb-2">
              Your streak and achievements are currently stored only on this
              device, not on our servers — reinstalling the app or switching
              devices resets them, even if you're signed in. Your workout
              history is different: if you're signed in, it's saved to your
              account and comes back automatically once you sign back in on any
              device.
            </p>
            <p className="text-xs text-muted-foreground font-body leading-relaxed mb-3">
              What never gets lost is your <strong>subscription</strong> —
              that's tracked by the App Store or Google Play, independent of
              this app or your device. Tap below to bring it back.
            </p>
            <button
              type="button"
              onClick={handleGoToRestorePurchases}
              className="w-full h-10 rounded-xl flex items-center justify-center gap-1.5 text-xs font-display font-bold uppercase tracking-wide bg-primary text-background transition-smooth hover:opacity-90 active:scale-[0.98]"
              data-ocid="faq.item.reinstalled.restore_link"
            >
              <RotateCcw className="w-3 h-3" />
              Go to Restore Purchases
            </button>
          </motion.div>

          {/* Cancel subscription */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="rounded-2xl p-4"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.5)",
            }}
            data-ocid="faq.item.cancel_subscription"
          >
            <p className="font-display font-bold text-sm text-foreground mb-1.5">
              How do I cancel my subscription?
            </p>
            <p className="text-xs text-muted-foreground font-body leading-relaxed">
              Subscriptions are managed by the App Store or Google Play, not
              inside this app. On iOS: Settings → [your name] → Subscriptions →
              MyBodyWeight → Cancel Subscription. On Android: Google Play Store
              → Menu → Subscriptions → MyBodyWeight → Cancel Subscription.
              You'll keep access until the end of your current billing period.
            </p>
          </motion.div>

          {/* Calorie estimate */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="rounded-2xl p-4"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.5)",
            }}
            data-ocid="faq.item.calorie_estimate"
          >
            <p className="font-display font-bold text-sm text-foreground mb-1.5">
              How is my calorie estimate calculated?
            </p>
            <p className="text-xs text-muted-foreground font-body leading-relaxed">
              It's based on the exercises in your workout plus the weight,
              height, and age you entered — it's an estimate, not a medical
              measurement. If your weight or height has changed, update it in
              Body Metrics (above) and future estimates will adjust
              automatically.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
