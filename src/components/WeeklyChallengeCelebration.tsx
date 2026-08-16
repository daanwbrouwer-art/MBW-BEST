import type { ChallengeCelebrationInfo } from "@/lib/challenge";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";

const GOLD = "#f59e0b";

export function WeeklyChallengeCelebration({
  celebration,
  onDismiss,
}: {
  celebration: ChallengeCelebrationInfo;
  onDismiss: () => void;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(onDismiss, 5500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      className="mx-5 mb-4 rounded-2xl p-4 flex items-start gap-3"
      style={{
        background: "oklch(0.22 0.08 60 / 0.25)",
        border: `1px solid ${GOLD}`,
        boxShadow: `0 0 30px ${GOLD}33`,
      }}
      data-ocid="home.weekly_challenge_celebration"
    >
      <motion.span
        className="text-3xl shrink-0"
        aria-hidden="true"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 0.9, repeat: 2, ease: "easeInOut" }}
      >
        🏆
      </motion.span>
      <div className="flex-1 min-w-0">
        <p className="font-display font-black text-lg text-white">
          Challenge Complete! 🏆
        </p>
        <p className="text-xs text-white/70 font-body mt-0.5">
          {celebration.description}
        </p>
        {celebration.tier === "registered" && (
          <p className="text-xs font-body mt-1.5" style={{ color: GOLD }}>
            Subscribe to save your challenge history.
          </p>
        )}
        {celebration.tier === "guest" && (
          <button
            type="button"
            onClick={() => navigate({ to: "/onboarding/create-account" })}
            className="text-xs font-display font-bold underline mt-1.5"
            style={{ color: GOLD }}
            data-ocid="home.weekly_challenge_celebration.create_account"
          >
            Register to save your achievements → Create account
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-white/40 hover:text-white/70 transition-smooth"
        aria-label="Dismiss"
        data-ocid="home.weekly_challenge_celebration.dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
