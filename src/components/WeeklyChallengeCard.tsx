import { daysUntilReset } from "@/lib/challenge";
import type { ChallengeTier } from "@/lib/challenge";
import type { ChallengeProgress, WeeklyChallengeRecord } from "@/types/challenge";
import { useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { motion } from "motion/react";

const TEAL = "#1AD6A0";
const GOLD = "#f59e0b";

export function WeeklyChallengeCard({
  challenge,
  progress,
  tier,
}: {
  challenge: WeeklyChallengeRecord;
  progress: ChallengeProgress;
  tier: ChallengeTier;
}) {
  const navigate = useNavigate();
  const completed = challenge.completedAt !== null;
  const daysLeft = daysUntilReset(challenge.weekStart);
  const pct = completed ? 100 : progress.pct;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.09, duration: 0.5 }}
      className="px-5 mb-6"
    >
      <div
        className="relative w-full rounded-2xl overflow-hidden pl-5 pr-4 py-4"
        style={{
          background: "#1a1a1a",
          border: "1px solid oklch(0.26 0.01 260 / 0.5)",
        }}
        data-ocid="home.weekly_challenge_card"
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ background: completed ? GOLD : TEAL }}
        />

        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[10px] font-display font-black uppercase tracking-widest"
            style={{ color: TEAL }}
          >
            Weekly Challenge
          </span>
          {completed && (
            <span
              className="flex items-center gap-1 text-[11px] font-display font-bold"
              style={{ color: GOLD }}
              data-ocid="home.weekly_challenge_card.completed_badge"
            >
              <Check className="w-3.5 h-3.5" /> Completed
            </span>
          )}
        </div>

        <p className="font-display font-bold text-sm text-white mb-3 leading-snug">
          {challenge.description}
        </p>

        <div
          className="w-full h-1.5 rounded-full overflow-hidden mb-1.5"
          style={{ background: "oklch(0.22 0.012 260)" }}
        >
          <motion.div
            className="h-full rounded-full"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: completed ? GOLD : TEAL,
              boxShadow: completed ? `0 0 8px ${GOLD}` : `0 0 6px ${TEAL}`,
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span
            className="text-xs font-body"
            style={{ color: "oklch(0.6 0.008 260)" }}
            data-ocid="home.weekly_challenge_card.progress_text"
          >
            {progress.current} / {progress.target} {challenge.unitLabel}
          </span>
          <span
            className="text-[10px] font-body"
            style={{ color: "oklch(0.5 0.008 260)" }}
          >
            {daysLeft <= 0
              ? "Resets today"
              : `Resets in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`}
          </span>
        </div>

        {completed && tier === "registered" && (
          <p
            className="text-[11px] font-body mt-3 pt-3"
            style={{
              color: "oklch(0.55 0.008 260)",
              borderTop: "1px solid oklch(0.24 0.01 260 / 0.6)",
            }}
            data-ocid="home.weekly_challenge_card.registered_note"
          >
            🔒 Subscribe to save your challenge history
          </p>
        )}

        {completed && tier === "guest" && (
          <p
            className="text-[11px] font-body mt-3 pt-3"
            style={{
              color: "oklch(0.6 0.008 260)",
              borderTop: "1px solid oklch(0.24 0.01 260 / 0.6)",
            }}
            data-ocid="home.weekly_challenge_card.guest_note"
          >
            Great work! Register to save your achievements →{" "}
            <button
              type="button"
              onClick={() => navigate({ to: "/onboarding/create-account" })}
              className="font-display font-bold underline"
              style={{ color: TEAL }}
              data-ocid="home.weekly_challenge_card.guest_note.create_account"
            >
              Create account
            </button>
          </p>
        )}
      </div>
    </motion.div>
  );
}
