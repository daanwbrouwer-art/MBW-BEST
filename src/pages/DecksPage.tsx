import { Logo } from "@/components/Logo";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useTier } from "@/hooks/use-tier";
import { isDifficultyLocked } from "@/lib/cardLimit";
import { getRecommendation } from "@/lib/recommendation";
import { useWorkoutStore } from "@/store/workout";
import type { DeckDifficulty } from "@/types/workout";
import {
  DECK_CATEGORY_LABEL,
  DECK_DIFFICULTY_DESCRIPTION,
  DECK_DIFFICULTY_LABEL,
} from "@/types/workout";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, X, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

/**
 * All 4 deck categories (Upper Body, Lower Body, Core, Full Body) expose the
 * same 3 difficulty tiers: Beginner, Advanced, Pro. None are subscriber-locked
 * in this build. Difficulty selection respects the currently selected category
 * from the workout store.
 */
const DIFFICULTIES: DeckDifficulty[] = ["Beginner", "Advanced", "Pro"];

/** GREEN accent for the Beginner badge per spec. */
const DIFFICULTY_COLOR: Record<DeckDifficulty, string> = {
  Beginner: "oklch(0.72 0.19 145)",
  Advanced: "oklch(0.75 0.18 60)",
  Pro: "oklch(0.65 0.22 30)",
};

export default function DecksPage() {
  const navigate = useNavigate();
  const { effectiveTier, guestMode: isGuest } = useTier();
  const isSubscriber = effectiveTier === "subscriber";
  const { selectedCategory, setSelectedDifficulty } = useWorkoutStore();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [lockedDifficulty, setLockedDifficulty] =
    useState<DeckDifficulty | null>(null);
  const { goals, fitnessLevel, selfAssessment } = useOnboarding();
  const recommendation = getRecommendation({ goals, fitnessLevel, selfAssessment });

  const recommendedDifficulty =
    selectedCategory && selectedCategory === recommendation.category
      ? recommendation.difficulty
      : null;

  // Pro has its own dedicated aspirational preview flow (navigated to
  // separately below) instead of this lock modal — only Advanced-for-guest
  // actually routes through isLocked/UpgradeModal.
  const isLocked = (difficulty: DeckDifficulty): boolean => {
    if (difficulty === "Pro") return false;
    return isDifficultyLocked(difficulty, effectiveTier);
  };

  const handleDifficultySelect = (diff: DeckDifficulty) => {
    if (isLocked(diff)) {
      setLockedDifficulty(diff);
      setShowUpgradeModal(true);
      return;
    }
    setSelectedDifficulty(diff);
    if (diff === "Pro" && !isSubscriber) {
      navigate({ to: "/decks/pro-preview" });
      return;
    }
    navigate({ to: "/workout/setup" });
  };

  const handleUpgrade = () => {
    setShowUpgradeModal(false);
    navigate({ to: "/subscribe" });
  };

  // All 3 difficulty tiers are offered for every category.
  const difficulties = DIFFICULTIES;

  return (
    <div
      className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto"
      data-ocid="decks.page"
    >
      {/* Ambient gradient */}
      <div
        className="pointer-events-none fixed inset-0 max-w-[430px] mx-auto"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.22 0.04 180 / 0.18) 0%, transparent 65%)",
        }}
      />

      {/* Header */}
      <header className="relative flex items-center gap-3 px-5 pt-12 pb-5">
        <motion.button
          type="button"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate({ to: "/home" })}
          className="w-10 h-10 rounded-xl bg-card border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/45 transition-smooth"
          data-ocid="decks.back_button"
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex-1"
        >
          <h1 className="font-display font-black text-xl text-foreground tracking-tight">
            {selectedCategory
              ? DECK_CATEGORY_LABEL[selectedCategory]
              : "Select Difficulty"}
          </h1>
          <p className="text-xs text-muted-foreground font-body">
            {selectedCategory
              ? `${DECK_CATEGORY_LABEL[selectedCategory]} — choose your difficulty`
              : "Choose your difficulty"}
          </p>
        </motion.div>
        <Logo size="sm" iconOnly className="opacity-70" />
      </header>

      {/* Content */}
      <div className="flex-1 px-5 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap
              className="w-3.5 h-3.5"
              style={{ color: "oklch(0.72 0.19 145)" }}
            />
            <h2 className="font-display font-bold text-sm text-foreground uppercase tracking-widest">
              Difficulty
            </h2>
            <div
              className="h-px flex-1"
              style={{
                background:
                  "linear-gradient(to right, oklch(0.72 0.19 145 / 0.3), transparent)",
              }}
            />
          </div>
          <div className="flex flex-col gap-3">
            {difficulties.map((diff, i) => (
              <DifficultyCard
                key={diff}
                difficulty={diff}
                index={i}
                locked={isLocked(diff)}
                accentColor={DIFFICULTY_COLOR[diff]}
                onSelect={handleDifficultySelect}
                recommended={diff === recommendedDifficulty}
                proPreviewLocked={diff === "Pro" && !isSubscriber}
              />
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-xs text-muted-foreground font-body mt-5"
          >
            {isSubscriber
              ? "This deck is open to everyone — no subscription required."
              : isGuest
                ? "Beginner is free. Register to unlock Advanced, or subscribe for Pro."
                : "Beginner and Advanced are free. Pro is a preview until you subscribe."}
          </motion.p>
        </motion.div>
      </div>

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <UpgradeModal
            difficulty={lockedDifficulty}
            isGuest={isGuest}
            onClose={() => setShowUpgradeModal(false)}
            onUpgrade={handleUpgrade}
            onRegister={() => {
              setShowUpgradeModal(false);
              navigate({ to: "/onboarding/create-account" });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Difficulty Card ────────────────────────────────────────────────────────

function DifficultyCard({
  difficulty,
  index,
  locked,
  accentColor,
  onSelect,
  recommended,
  proPreviewLocked,
}: {
  difficulty: DeckDifficulty;
  index: number;
  locked: boolean;
  accentColor: string;
  onSelect: (diff: DeckDifficulty) => void;
  recommended?: boolean;
  /** Pro deck, non-subscriber — visible and tappable (opens a preview, not a paywall), styled distinctly aspirational rather than "locked out". */
  proPreviewLocked?: boolean;
}) {
  const effectiveLocked = locked;

  const borderWithOpacity = accentColor.replace(")", " / 0.35)");
  const glowWithOpacity = accentColor.replace(")", " / 0.1)");
  const bgWithOpacity = accentColor.replace(")", " / 0.12)");
  const borderBadge = accentColor.replace(")", " / 0.3)");

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.05 + index * 0.09,
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(difficulty)}
      className="relative w-full overflow-hidden rounded-3xl border text-left transition-smooth"
      style={{
        background: proPreviewLocked
          ? "#141414"
          : effectiveLocked
            ? "oklch(0.14 0.01 260)"
            : "oklch(0.16 0.012 260)",
        borderColor: proPreviewLocked
          ? "oklch(0.68 0.25 180 / 0.22)"
          : effectiveLocked
            ? "oklch(0.28 0.01 260 / 0.5)"
            : borderWithOpacity,
        boxShadow: effectiveLocked ? "none" : `0 4px 24px ${glowWithOpacity}`,
      }}
      data-ocid={`decks.difficulty.item.${index + 1}`}
    >
      {effectiveLocked && (
        <>
          <div
            className="absolute inset-0 z-10 rounded-3xl pointer-events-none"
            style={{ background: "oklch(0.08 0.005 260 / 0.4)" }}
          />
          <div
            className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: "oklch(0.3 0.01 260 / 0.6)",
              border: "1px solid oklch(0.4 0.01 260 / 0.6)",
            }}
            data-ocid="decks.difficulty.locked_icon"
          >
            <span className="text-xs" aria-hidden="true">
              🔒
            </span>
          </div>
        </>
      )}

      {proPreviewLocked && (
        <>
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, transparent 40%, oklch(0 0 0 / 0.5) 100%)",
            }}
          />
          <div
            className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: "oklch(0.68 0.25 180 / 0.15)",
              border: "1px solid oklch(0.68 0.25 180 / 0.35)",
            }}
            data-ocid="decks.difficulty.pro_lock_icon"
          >
            <span className="text-xs" aria-hidden="true">
              🔒
            </span>
          </div>
        </>
      )}

      <div className="relative z-20 flex items-center gap-4 p-5">
        {/* Left accent bar */}
        <div
          className="w-1 self-stretch rounded-full shrink-0"
          style={{
            background: effectiveLocked ? "oklch(0.28 0.01 260)" : accentColor,
          }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3
              className="font-display font-black text-lg leading-tight"
              style={{
                color: effectiveLocked
                  ? "oklch(0.5 0.01 260)"
                  : "oklch(0.96 0.01 260)",
              }}
            >
              {DECK_DIFFICULTY_LABEL[difficulty]}
            </h3>
            {/* GREEN Beginner badge — no lock icon for this open deck */}
            {recommended && (
              <span
                className="px-2 py-0.5 rounded-full text-[9px] font-display font-black tracking-widest uppercase"
                style={{
                  background: "oklch(0.68 0.25 180 / 0.15)",
                  color: "oklch(0.68 0.25 180)",
                  border: "1px solid oklch(0.68 0.25 180 / 0.35)",
                }}
                data-ocid="decks.difficulty.recommended_badge"
              >
                Recommended
              </span>
            )}
          </div>
          {proPreviewLocked && (
            <p
              className="text-[11px] font-display font-bold uppercase tracking-wide mb-1"
              style={{ color: "oklch(0.68 0.25 180)" }}
              data-ocid="decks.difficulty.pro_lock_label"
            >
              Subscriber only
            </p>
          )}
          {effectiveLocked && (
            <p
              className="text-[11px] font-display font-bold uppercase tracking-wide mb-1"
              style={{ color: "oklch(0.55 0.008 260)" }}
              data-ocid="decks.difficulty.locked_label"
            >
              Register free to unlock
            </p>
          )}
          <p
            className="text-sm font-body"
            style={{
              color: effectiveLocked
                ? "oklch(0.4 0.008 260)"
                : "oklch(0.6 0.01 260)",
            }}
          >
            {DECK_DIFFICULTY_DESCRIPTION[difficulty]}
          </p>
          {difficulty === "Advanced" && !effectiveLocked && (
            <p
              className="text-xs font-body italic mt-1.5"
              style={{ color: "oklch(0.55 0.01 260)" }}
              data-ocid="decks.difficulty.path_to_pro"
            >
              Master this deck and you'll be ready for Pro.
            </p>
          )}
        </div>

        {/* Tier badge — GREEN for Beginner, "AVAILABLE" since open to all; hidden on locked cards, which already communicate status via the lock icon + label above */}
        {!proPreviewLocked && !effectiveLocked && (
          <div
            className="shrink-0 px-2.5 py-1 rounded-full text-[9px] font-display font-black tracking-widest uppercase"
            style={{
              background: bgWithOpacity,
              color: accentColor,
              border: `1px solid ${borderBadge}`,
            }}
            data-ocid={`decks.difficulty.badge.${difficulty.toLowerCase()}`}
          >
            AVAILABLE
          </div>
        )}
      </div>
    </motion.button>
  );
}

// ─── Upgrade Modal ──────────────────────────────────────────────────────────

function UpgradeModal({
  difficulty,
  isGuest,
  onClose,
  onUpgrade,
  onRegister,
}: {
  difficulty: DeckDifficulty | null;
  isGuest: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  onRegister: () => void;
}) {
  // The only case that currently reaches this modal is Advanced-for-guest
  // (Pro has its own dedicated preview flow instead) — a free account alone
  // unlocks Advanced, so lead with "Register", not "Subscribe".
  const isGuestAdvancedCase = difficulty === "Advanced" && isGuest;
  const title = isGuestAdvancedCase ? "Free Account Required" : "Subscriber Only";
  const body = isGuestAdvancedCase
    ? "Advanced decks require a free account. Register now — it only takes a few seconds, and your progress carries right over."
    : difficulty === "Advanced"
      ? "Advanced decks are available to Subscribers. Upgrade your plan to train at a higher intensity."
      : "Pro decks are available to Subscribers. Upgrade your plan to unlock the hardest challenges.";
  const cta = isGuestAdvancedCase ? "Register Free" : "Upgrade to Subscriber";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
      style={{ background: "oklch(0 0 0 / 0.75)" }}
      onClick={onClose}
      data-ocid="decks.upgrade.dialog"
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.42 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-3xl overflow-hidden"
        style={{
          background: "oklch(0.14 0.012 260)",
          border: "1px solid oklch(0.75 0.18 60 / 0.25)",
          boxShadow:
            "0 -4px 60px oklch(0.75 0.18 60 / 0.12), 0 20px 60px oklch(0 0 0 / 0.6)",
        }}
      >
        <div
          className="h-1 w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, oklch(0.72 0.18 60), oklch(0.68 0.25 180), transparent)",
          }}
        />
        <div className="px-6 pt-6 pb-7">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.72 0.18 60 / 0.2), oklch(0.62 0.20 55 / 0.1))",
                  border: "1px solid oklch(0.72 0.18 60 / 0.3)",
                }}
              >
                <span className="text-base">🔒</span>
              </div>
              <h3 className="font-display font-black text-lg text-foreground">
                {title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-smooth"
              data-ocid="decks.upgrade.close_button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm font-body text-muted-foreground leading-relaxed mb-6">
            {body}
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={isGuestAdvancedCase ? onRegister : onUpgrade}
              className="w-full h-12 rounded-2xl font-display font-black text-sm tracking-widest uppercase transition-smooth"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.72 0.18 60), oklch(0.62 0.20 55))",
                color: "oklch(0.12 0.01 60)",
                boxShadow: "0 4px 20px oklch(0.72 0.18 60 / 0.3)",
              }}
              data-ocid="decks.upgrade.confirm_button"
            >
              {cta}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-11 rounded-2xl font-display font-bold text-sm text-muted-foreground hover:text-foreground transition-smooth"
              data-ocid="decks.upgrade.cancel_button"
            >
              Maybe later
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
