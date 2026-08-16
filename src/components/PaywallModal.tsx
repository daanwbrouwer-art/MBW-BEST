import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";

const VALUE_PROPS: { emoji: string; text: string }[] = [
  { emoji: "🃏", text: "Unlimited card draws — no weekly limits" },
  { emoji: "🏆", text: "Achievements and streaks" },
  { emoji: "⭐", text: "Access to all Pro decks" },
];

/**
 * The shared full-screen paywall — shown whenever a user hits their weekly
 * card limit or taps a subscriber-only feature. `onSubscribe` is a thin
 * wrapper the caller wires up (today: navigates to /subscribe, the app's
 * real checkout flow — the actual payment provider integration lives
 * there, behind `src/lib/payments.ts`).
 */
export function PaywallModal({ onDismiss }: { onDismiss: () => void }) {
  const navigate = useNavigate();

  const handleSubscribe = () => {
    onDismiss();
    navigate({ to: "/subscribe" });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center px-5"
      style={{ background: "oklch(0.05 0.005 260 / 0.92)" }}
      data-ocid="paywall.modal"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
        className="w-full max-w-[400px] rounded-3xl overflow-hidden"
        style={{
          background: "oklch(0.13 0.01 260)",
          border: "1px solid oklch(0.68 0.25 180 / 0.3)",
          boxShadow: "0 20px 60px oklch(0 0 0 / 0.6)",
        }}
      >
        <div className="px-6 pt-8 pb-7">
          <h2 className="font-display font-black text-2xl text-white text-center leading-tight mb-2">
            Unlock your full potential 💪
          </h2>
          <p className="text-sm text-white/70 font-body text-center mb-6">
            Get unlimited workouts, all decks, achievements, and more.
          </p>

          <div className="flex flex-col gap-3 mb-7">
            {VALUE_PROPS.map((prop) => (
              <div
                key={prop.text}
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{
                  background: "oklch(0.17 0.015 180 / 0.25)",
                  border: "1px solid oklch(0.68 0.25 180 / 0.2)",
                }}
              >
                <span className="text-xl shrink-0" aria-hidden="true">
                  {prop.emoji}
                </span>
                <p className="text-sm text-white/90 font-body leading-snug">
                  {prop.text}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSubscribe}
            className="w-full h-14 rounded-full flex items-center justify-center font-display font-bold text-base tracking-wide bg-primary text-background transition-smooth hover:opacity-90 active:scale-[0.98] mb-3"
            data-ocid="paywall.subscribe_button"
          >
            Subscribe now
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-smooth"
            data-ocid="paywall.dismiss_link"
          >
            Not now
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
