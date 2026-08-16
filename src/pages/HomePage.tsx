import { AchievementProgressCard } from "@/components/AchievementProgressCard";
import { AchievementUnlockAnimation } from "@/components/AchievementUnlockAnimation";
import { BottomNav } from "@/components/BottomNav";
import { HowToPlayModal } from "@/components/HowToPlayModal";
import { RecoveryTip } from "@/components/RecoveryTip";
import { UsageIndicator } from "@/components/UsageIndicator";
import { WeeklyChallengeCard } from "@/components/WeeklyChallengeCard";
import { WeeklyChallengeCelebration } from "@/components/WeeklyChallengeCelebration";
import { useAchievementUnlockQueue } from "@/hooks/use-achievement-unlock-queue";
import { useAchievements } from "@/hooks/use-achievements";
import { useNotifications } from "@/hooks/use-notifications";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useProfile } from "@/hooks/use-profile";
import { useStreak } from "@/hooks/use-streak";
import { useTier } from "@/hooks/use-tier";
import { useTrialExpiryModal } from "@/hooks/use-trial";
import { useWeeklyChallenge } from "@/hooks/use-weekly-challenge";
import { useWorkoutHistory } from "@/hooks/use-workout-history";
import {
  type AchievementView,
  drainPendingUnlockAnimations,
} from "@/lib/achievementEngine";
import { capDifficultyToTier, weeklyCardLimitFor } from "@/lib/cardLimit";
import { getRecommendation } from "@/lib/recommendation";
import { applyRecoveryLogic, formatRecoveryTip } from "@/lib/recovery";
import {
  type CelebrationInfo,
  type EndedNudgeInfo,
  getCardsDrawnThisWeek,
} from "@/lib/streak";
import { useWorkoutStore } from "@/store/workout";
import type { StreakData } from "@/types/streak";
import type { TrialStatus, TrialSummaryStats } from "@/types/trial";
import {
  DECK_CATEGORY_DESCRIPTION,
  DECK_CATEGORY_ICON,
  DECK_CATEGORY_LABEL,
  DECK_DIFFICULTY_LABEL,
  type DeckCategory,
} from "@/types/workout";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  ChevronRight,
  Crown,
  Sparkles,
  Star,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const ALL_CATEGORIES: DeckCategory[] = [
  "UpperBody",
  "LowerBody",
  "Core",
  "FullBody",
];

export default function HomePage() {
  const navigate = useNavigate();
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const { data: profile } = useProfile();
  const { data: history } = useWorkoutHistory();
  const { setSelectedCategory, setSelectedDifficulty } = useWorkoutStore();
  const { goals, fitnessLevel, selfAssessment } = useOnboarding();
  const {
    streak,
    celebration,
    endedNudge,
    dismissCelebration,
    dismissEndedNudge,
    isGuest,
  } = useStreak();
  const { trialStatus, isSubscriber, effectiveTier } = useTier();
  const {
    showModal: showTrialExpiredModal,
    stats: trialStats,
    dismiss: dismissTrialExpiredModal,
  } = useTrialExpiryModal();
  const { achievements } = useAchievements();
  const { settings: notifSettings, browserPermission } = useNotifications();
  const {
    current: unlockAnim,
    enqueue: enqueueUnlocks,
    handleComplete: handleUnlockComplete,
  } = useAchievementUnlockQueue();

  // Drains achievements granted in a batch right after subscribing (see
  // useTier().purchase()) and plays their unlock animations here.
  useEffect(() => {
    const pending = drainPendingUnlockAnimations(isGuest);
    if (pending.length === 0) return;
    enqueueUnlocks(pending);
    if (browserPermission === "granted" && notifSettings.enabled) {
      for (const a of pending) {
        try {
          new Notification(`🏆 Achievement unlocked: ${a.name}!`, {
            body: "Open the app to see it.",
          });
        } catch {
          // Notification constructor can throw in some embedded contexts — non-fatal.
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest]);

  // Closest-to-completion achievement — hidden ones never surface here so
  // the home screen doesn't spoil secrets.
  const featuredAchievement = (() => {
    const candidates = achievements.filter((a) => !a.unlocked && !a.hidden);
    if (candidates.length === 0) return null;
    return [...candidates].sort(
      (a, b) => b.progress / b.target - a.progress / a.target,
    )[0];
  })();

  const recommendation = getRecommendation({ goals, fitnessLevel, selfAssessment });
  // Capped to what this tier can actually play — otherwise a guest could
  // get recommended (and one-tap start) an Advanced/Pro deck the difficulty
  // selector itself would never let them choose.
  const recommendedDifficulty = capDifficultyToTier(
    recommendation.difficulty,
    effectiveTier,
  );
  const recovery = applyRecoveryLogic(recommendation.category, isGuest);
  const recommendedCategory = recovery.category;
  const recoveryTipText = recovery.tip ? formatRecoveryTip(recovery.tip) : null;

  const weeklyCardLimit = weeklyCardLimitFor(effectiveTier);
  const cardsUsedThisWeek = getCardsDrawnThisWeek(isGuest);

  const {
    challenge: weeklyChallenge,
    progress: challengeProgress,
    tier: challengeTier,
    celebration: challengeCelebration,
    dismissCelebration: dismissChallengeCelebration,
  } = useWeeklyChallenge();

  const username = profile?.username ?? "Athlete";

  const workoutCount = history?.length ?? 0;
  const totalCards =
    history?.reduce((acc, e) => acc + Number(e.cardsCompleted), 0) ?? 0;
  const totalCalories =
    history?.reduce((acc, e) => acc + Number(e.caloriesBurned), 0) ?? 0;

  const handleSelectCategory = (cat: DeckCategory) => {
    setSelectedCategory(cat);
    navigate({ to: "/decks" });
  };

  const handleStartRecommended = () => {
    setSelectedCategory(recommendedCategory);
    setSelectedDifficulty(recommendedDifficulty);
    navigate({ to: "/workout/setup" });
  };

  const handleTrialSubscribe = () => {
    navigate({ to: "/subscribe" });
  };

  const handleTrialLearnMore = () => {
    toast("Your free trial", {
      description:
        "Unlimited cards, every Pro deck, the full achievement system, and your complete streak history — free for 7 days.",
      duration: 6000,
    });
  };

  const handleTrialExpiredSubscribe = () => {
    dismissTrialExpiredModal();
    navigate({ to: "/subscribe" });
  };

  return (
    <>
      <HowToPlayModal
        open={howToPlayOpen}
        onClose={() => setHowToPlayOpen(false)}
      />
      {unlockAnim && (
        <AchievementUnlockAnimation
          achievement={unlockAnim}
          onComplete={handleUnlockComplete}
        />
      )}
      <div
        className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto overflow-x-hidden pb-24"
        data-ocid="home.page"
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none max-w-[430px] mx-auto"
          style={{
            background:
              "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.22 0.04 180 / 0.22) 0%, transparent 55%)",
          }}
        />

        {/* 1. TOP BAR */}
        <header className="relative flex items-center justify-between px-5 pt-12 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted/40 flex items-center justify-center shrink-0 border border-primary/20">
              <User className="w-5 h-5 text-white/60" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-muted-foreground font-body leading-none mb-0.5">
                Welcome back,
              </span>
              <span className="font-display font-black text-sm text-white leading-none">
                {username}.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="w-9 h-9 rounded-xl bg-card/80 border border-border/60 flex items-center justify-center text-white hover:border-primary/50 hover:text-primary transition-smooth"
            onClick={() => setHowToPlayOpen(true)}
            data-ocid="home.notification_button"
            aria-label="Notifications"
          >
            <Bell className="w-[22px] h-[22px]" />
          </button>
        </header>

        {/* 1b. TRIAL BANNER */}
        {!isSubscriber && (
          <TrialBanner
            trialStatus={trialStatus}
            onSubscribe={handleTrialSubscribe}
            onLearnMore={handleTrialLearnMore}
          />
        )}

        {/* 1c. WEEKLY CARD USAGE — hidden for subscribers (unlimited) and during an active trial (effectiveTier already reads "subscriber") */}
        {effectiveTier !== "subscriber" && weeklyCardLimit !== null && (
          <UsageIndicator
            tier={effectiveTier}
            cardsUsed={cardsUsedThisWeek}
            limit={weeklyCardLimit}
          />
        )}

        {/* 2. LOGO SECTION */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center py-6"
        >
          <img
            src="/assets/images/mbw-logo-white-icon.png"
            alt="MyBodyWeight logo"
            className="w-16 h-16 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <p className="text-lg font-black uppercase tracking-widest text-white mt-2 font-display">
            MYBODYWEIGHT
          </p>
        </motion.div>

        {/* 2b. RECOMMENDED FOR YOU */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.5 }}
          className="px-5 mb-6"
        >
          <div
            className="w-full rounded-2xl p-4"
            style={{
              background: "oklch(0.17 0.04 180 / 0.35)",
              border: "1px solid oklch(0.68 0.25 180 / 0.35)",
              boxShadow: "0 0 24px oklch(0.68 0.25 180 / 0.1)",
            }}
            data-ocid="home.recommended_deck_card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "oklch(0.68 0.25 180 / 0.15)",
                  border: "1px solid oklch(0.68 0.25 180 / 0.3)",
                }}
              >
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className="inline-block text-[9px] font-display font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-1"
                  style={{
                    background: "oklch(0.68 0.25 180 / 0.2)",
                    color: "oklch(0.68 0.25 180)",
                  }}
                >
                  Recommended
                </span>
                <p className="font-display font-black text-sm text-white truncate">
                  {DECK_DIFFICULTY_LABEL[recommendedDifficulty]}{" "}
                  {DECK_CATEGORY_LABEL[recommendedCategory]}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-body mb-3 leading-snug">
              {recommendation.reason}
            </p>
            <button
              type="button"
              onClick={handleStartRecommended}
              className="w-full h-11 rounded-xl font-display font-bold text-sm tracking-wide flex items-center justify-center gap-1.5 transition-smooth active:scale-[0.98]"
              style={{
                background: "oklch(0.68 0.25 180)",
                color: "oklch(0.08 0.005 260)",
              }}
              data-ocid="home.recommended_deck_button"
            >
              Start workout <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {recoveryTipText && <RecoveryTip text={recoveryTipText} />}
        </motion.section>

        {/* 2c. STREAK CELEBRATION / ENDED NUDGE */}
        {celebration && (
          <StreakCelebration
            celebration={celebration}
            onDismiss={dismissCelebration}
          />
        )}
        {endedNudge && !celebration && (
          <StreakEndedNudge
            endedNudge={endedNudge}
            onDismiss={dismissEndedNudge}
            onAdjustGoal={() => navigate({ to: "/profile" })}
          />
        )}

        {/* 2d. STREAK BADGE */}
        <StreakBadge streak={streak} onViewHistory={() => navigate({ to: "/streak" })} />

        {/* 2e. WEEKLY CHALLENGE CELEBRATION */}
        {challengeCelebration && (
          <WeeklyChallengeCelebration
            celebration={challengeCelebration}
            onDismiss={dismissChallengeCelebration}
          />
        )}

        {/* 2f. WEEKLY CHALLENGE */}
        <WeeklyChallengeCard
          challenge={weeklyChallenge}
          progress={challengeProgress}
          tier={challengeTier}
        />

        {/* 3. CHOOSE YOUR DECK */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-6"
        >
          <p className="text-xs font-display font-bold uppercase tracking-widest text-muted-foreground px-5 mb-3">
            CHOOSE YOUR DECK
          </p>

          <div className="grid grid-cols-2 gap-3 px-5">
            {ALL_CATEGORIES.map((cat, i) => (
              <HomeDeckCard
                key={cat}
                category={cat}
                index={i}
                onSelect={handleSelectCategory}
                isRecommended={cat === recommendedCategory}
              />
            ))}
          </div>
        </motion.section>

        {/* 3b. BUILD YOUR OWN (custom workout, premium) */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.13, duration: 0.5 }}
          className="mb-6 px-5"
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate({ to: "/custom-workout" })}
            className="relative w-full overflow-hidden rounded-2xl border text-left p-4 flex items-center gap-3.5 transition-smooth"
            style={{
              borderColor: "oklch(0.76 0.22 60 / 0.35)",
              background:
                "linear-gradient(135deg, oklch(0.19 0.03 60 / 0.5) 0%, oklch(0.16 0.015 260 / 0.6) 100%)",
            }}
            data-ocid="home.custom_workout_banner"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "oklch(0.76 0.22 60 / 0.15)",
                border: "1px solid oklch(0.76 0.22 60 / 0.35)",
              }}
            >
              <Crown
                className="w-5 h-5"
                style={{ color: "oklch(0.76 0.22 60)" }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-display font-black text-sm text-foreground">
                  Build Your Own
                </h3>
                {!isSubscriber && (
                  <span
                    className="text-[8px] font-display font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                    style={{
                      background: "oklch(0.76 0.22 60 / 0.2)",
                      color: "oklch(0.76 0.22 60)",
                    }}
                  >
                    Premium
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground font-body mt-0.5 leading-snug">
                Pick your own exercises and train your way
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </motion.button>
        </motion.section>

        {/* 4. FEATURED ACHIEVEMENT */}
        {featuredAchievement && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.45 }}
            className="px-5 mb-6"
          >
            <p className="text-xs font-display font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Next Achievement
            </p>
            <FeaturedAchievement
              achievement={featuredAchievement}
              onOpen={() => navigate({ to: "/achievements" })}
            />
          </motion.section>
        )}

        {/* 5. STATS OVERVIEW */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.45 }}
          className="px-5 mb-6"
        >
          <p className="text-xs font-display font-bold uppercase tracking-widest text-muted-foreground mb-3">
            STATS OVERVIEW
          </p>
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              value={workoutCount}
              label="WORKOUTS"
              ocid="home.stats.workouts"
            />
            <StatCard
              value={totalCards}
              label="CARDS DRAWN"
              ocid="home.stats.cards"
            />
            <StatCard
              value={totalCalories}
              label="CALORIES"
              suffix="kcal"
              ocid="home.stats.calories"
            />
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="mt-auto px-5 pb-4 text-center">
          <p className="text-xs text-muted-foreground font-body">
            © {new Date().getFullYear()} MyBodyWeight
          </p>
        </footer>
      </div>

      <BottomNav active="home" />

      <AnimatePresence>
        {showTrialExpiredModal && (
          <TrialExpiredModal
            stats={trialStats}
            onSubscribe={handleTrialExpiredSubscribe}
            onDismiss={dismissTrialExpiredModal}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Streak badge ─────────────────────────────────────────────────────────

function StatChip({ label }: { label: string }) {
  return (
    <span
      className="inline-block text-[10px] font-body px-2 py-1 rounded-full truncate max-w-full"
      style={{
        background: "oklch(0.2 0.01 260 / 0.6)",
        color: "oklch(0.72 0.008 260)",
        border: "1px solid oklch(0.3 0.01 260 / 0.5)",
      }}
    >
      {label}
    </span>
  );
}

// ─── Featured achievement ──────────────────────────────────────────────────

function FeaturedAchievement({
  achievement,
  onOpen,
}: {
  achievement: AchievementView;
  onOpen: () => void;
}) {
  return (
    <div className="max-w-[220px]">
      <AchievementProgressCard achievement={achievement} onTap={onOpen} />
    </div>
  );
}

function StreakBadge({
  streak,
  onViewHistory,
}: {
  streak: StreakData;
  onViewHistory: () => void;
}) {
  const bestExerciseLabel = streak.bestExercise
    ? `${streak.bestExercise.name} PR: ${streak.bestExercise.reps} reps`
    : "No PR yet — go set one";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.5 }}
      className="px-5 mb-6"
    >
      <div
        className="w-full rounded-2xl p-4 flex items-start gap-3"
        style={{
          background: "oklch(0.15 0.01 260)",
          border: "1px solid oklch(0.26 0.01 260 / 0.6)",
        }}
        data-ocid="home.streak_badge"
      >
        <div className="flex flex-col items-center shrink-0 pr-3 border-r border-white/10">
          <span className="text-3xl leading-none" aria-hidden="true">
            🔥
          </span>
          <span
            className="font-display font-black text-2xl text-white leading-none mt-1"
            data-ocid="home.streak_badge.weeks"
          >
            {streak.current}
          </span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide mt-0.5 whitespace-nowrap">
            week streak
          </span>
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <p className="text-xs text-white/70 font-body">
            {streak.currentWeekTrainingDays}/{streak.weeklyGoal} days this
            week
          </p>
          <div className="flex gap-1.5 flex-wrap">
            <StatChip label={`${streak.totalTrainingDaysThisYear} days this year`} />
            <StatChip label={bestExerciseLabel} />
          </div>
        </div>

        <button
          type="button"
          onClick={onViewHistory}
          className="shrink-0 text-xs font-display font-bold text-primary hover:opacity-75 transition-smooth whitespace-nowrap"
          data-ocid="home.streak_badge.view_history"
        >
          View history →
        </button>
      </div>
    </motion.div>
  );
}

function StreakCelebration({
  celebration,
  onDismiss,
}: {
  celebration: CelebrationInfo;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      className="mx-5 mb-4 rounded-2xl p-4 flex items-center gap-3"
      style={{
        background: "oklch(0.2 0.06 180 / 0.35)",
        border: "1px solid oklch(0.68 0.25 180 / 0.5)",
        boxShadow: "0 0 30px oklch(0.68 0.25 180 / 0.25)",
      }}
      data-ocid="home.streak_celebration"
    >
      <motion.span
        className="text-3xl shrink-0"
        aria-hidden="true"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 0.9, repeat: 2, ease: "easeInOut" }}
      >
        🔥
      </motion.span>
      <div className="flex-1 min-w-0">
        <motion.p
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 15 }}
          className="font-display font-black text-lg text-white"
        >
          {celebration.weeks}-week streak!
        </motion.p>
        <p className="text-xs text-white/70 font-body mt-0.5">
          {celebration.message}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-white/40 hover:text-white/70 transition-smooth"
        aria-label="Dismiss"
        data-ocid="home.streak_celebration.dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

function StreakEndedNudge({
  endedNudge,
  onDismiss,
  onAdjustGoal,
}: {
  endedNudge: EndedNudgeInfo;
  onDismiss: () => void;
  onAdjustGoal: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-5 mb-4 rounded-2xl p-4 flex items-start gap-3"
      style={{
        background: "oklch(0.18 0.02 260 / 0.7)",
        border: "1px solid oklch(0.4 0.02 260 / 0.6)",
      }}
      data-ocid="home.streak_ended_nudge"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/85 font-body leading-relaxed">
          Your {endedNudge.endedFromWeeks}-week streak ended — you trained
          fewer than {endedNudge.weeklyGoal} days last week. Want to start a
          new one today, or{" "}
          <button
            type="button"
            onClick={onAdjustGoal}
            className="text-primary font-bold underline hover:opacity-75 transition-smooth"
            data-ocid="home.streak_ended_nudge.adjust_goal"
          >
            adjust your weekly goal
          </button>
          ?
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-white/40 hover:text-white/70 transition-smooth"
        aria-label="Dismiss"
        data-ocid="home.streak_ended_nudge.dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ─── Trial banner ─────────────────────────────────────────────────────────

function TrialBanner({
  trialStatus,
  onSubscribe,
  onLearnMore,
}: {
  trialStatus: TrialStatus;
  onSubscribe: () => void;
  onLearnMore: () => void;
}) {
  if (trialStatus.kind !== "active") return null;
  const { dayNumber, daysLeft } = trialStatus;

  if (dayNumber <= 5) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-5 mt-2 mb-1 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3"
        style={{
          background: "oklch(0.16 0.01 260)",
          border: "1px solid oklch(0.68 0.25 180 / 0.3)",
        }}
        data-ocid="home.trial_banner"
      >
        <p className="text-xs text-white font-body flex-1 leading-snug">
          🎉 Free trial — {daysLeft} {daysLeft === 1 ? "day" : "days"} left.
          Enjoy full access!
        </p>
        <button
          type="button"
          onClick={onLearnMore}
          className="shrink-0 text-[11px] font-display font-bold text-primary hover:opacity-75 transition-smooth"
          data-ocid="home.trial_banner.learn_more"
        >
          Learn more
        </button>
      </motion.div>
    );
  }

  if (dayNumber === 6) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-5 mt-2 mb-1 rounded-2xl px-4 py-3.5 flex items-center gap-3"
        style={{
          background: "oklch(0.18 0.03 180 / 0.4)",
          border: "1px solid oklch(0.68 0.25 180 / 0.55)",
          boxShadow: "0 0 24px oklch(0.68 0.25 180 / 0.15)",
        }}
        data-ocid="home.trial_banner"
      >
        <p className="flex-1 text-sm text-white font-display font-bold leading-snug">
          ⏰ 1 day left on your free trial. Subscribe to keep full access →
        </p>
        <button
          type="button"
          onClick={onSubscribe}
          className="shrink-0 px-4 h-9 rounded-full bg-primary text-background font-display font-bold text-xs tracking-wide transition-smooth hover:opacity-90 active:scale-[0.98]"
          data-ocid="home.trial_banner.subscribe"
        >
          Subscribe
        </button>
      </motion.div>
    );
  }

  // dayNumber === 7 — final day
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-5 mt-2 mb-1 rounded-2xl px-4 py-3.5 flex items-center gap-3"
      style={{
        background: "oklch(0.22 0.08 60 / 0.22)",
        border: "1px solid #f59e0b",
        boxShadow: "0 0 24px #f59e0b33",
      }}
      data-ocid="home.trial_banner"
    >
      <p className="flex-1 text-sm text-white font-display font-bold leading-snug">
        Your free trial ends today. Don't lose your progress → Subscribe now
      </p>
      <button
        type="button"
        onClick={onSubscribe}
        className="shrink-0 px-4 h-9 rounded-full font-display font-bold text-xs tracking-wide transition-smooth hover:opacity-90 active:scale-[0.98]"
        style={{ background: "#f59e0b", color: "#1a1200" }}
        data-ocid="home.trial_banner.subscribe"
      >
        Subscribe
      </button>
    </motion.div>
  );
}

// ─── Trial expired modal ───────────────────────────────────────────────────

function TrialStatLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: "oklch(0.68 0.25 180)" }}
      />
      <p className="text-sm text-white/85 font-body">{text}</p>
    </div>
  );
}

function TrialExpiredModal({
  stats,
  onSubscribe,
  onDismiss,
}: {
  stats: TrialSummaryStats;
  onSubscribe: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center px-5"
      style={{ background: "oklch(0.05 0.005 260 / 0.92)" }}
      data-ocid="home.trial_expired_modal"
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
          <h2 className="font-display font-black text-2xl text-white text-center leading-tight mb-5">
            Your free trial has ended
          </h2>

          <div className="flex flex-col gap-2.5 mb-6">
            <TrialStatLine text={`In 7 days, you drew ${stats.cardsDrawn} cards`} />
            <TrialStatLine
              text={`You completed ${stats.workoutsCompleted} workouts`}
            />
            <TrialStatLine
              text={`Your streak reached ${stats.daysTrained} days`}
            />
            <TrialStatLine
              text={`You unlocked ${stats.achievementsUnlocked} achievements`}
            />
          </div>

          <p className="text-center text-sm text-white/80 font-body mb-5">
            Subscribe to keep everything you've built.
          </p>

          <div
            className="rounded-2xl p-4 mb-6 flex flex-col gap-2"
            style={{
              background: "oklch(0.17 0.015 180 / 0.25)",
              border: "1px solid oklch(0.68 0.25 180 / 0.25)",
            }}
          >
            <p className="text-xs text-white/70 font-body leading-relaxed">
              Your achievements and streak history will be waiting for you.
            </p>
            <p className="text-xs text-white/70 font-body leading-relaxed">
              Your 20 cards/week limit is now active.
            </p>
          </div>

          <button
            type="button"
            onClick={onSubscribe}
            className="w-full h-14 rounded-full flex items-center justify-center font-display font-bold text-sm tracking-wide bg-primary text-background transition-smooth hover:opacity-90 active:scale-[0.98] mb-3"
            data-ocid="home.trial_expired_modal.subscribe_button"
          >
            Subscribe now
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-smooth"
            data-ocid="home.trial_expired_modal.dismiss_link"
          >
            Continue with free plan
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({
  value,
  label,
  suffix,
  ocid,
}: {
  value: number;
  label: string;
  suffix?: string;
  ocid: string;
}) {
  return (
    <div
      className="rounded-xl bg-card p-4 flex flex-col"
      style={{ border: "1px solid oklch(0.22 0.01 260 / 0.5)" }}
      data-ocid={ocid}
    >
      <span className="font-display font-black text-2xl text-white leading-none">
        {value.toLocaleString()}
        {suffix ? ` ${suffix}` : ""}
      </span>
      <span className="text-xs text-muted-foreground font-display font-bold uppercase tracking-wider mt-1.5">
        {label}
      </span>
    </div>
  );
}

// ─── Home Deck Card (authenticated users) ────────────────────────────────────

function HomeDeckCard({
  category,
  index,
  onSelect,
  isRecommended,
}: {
  category: DeckCategory;
  index: number;
  onSelect: (cat: DeckCategory) => void;
  isRecommended?: boolean;
}) {
  const suits = ["♥", "♠", "♦", "♣"];
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.07,
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onSelect(category)}
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-card text-left flex flex-col gap-2.5 p-4 hover:border-primary/50 hover:shadow-[0_0_20px_oklch(0.68_0.25_180/0.15)] transition-smooth"
      style={{ minHeight: "8.5rem" }}
      data-ocid={`home.deck_card.${index + 1}`}
    >
      {isRecommended && (
        <span
          className="absolute top-2.5 right-2.5 flex items-center gap-0.5 text-[8px] font-display font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full z-10"
          style={{
            background: "oklch(0.68 0.25 180 / 0.2)",
            color: "oklch(0.68 0.25 180)",
          }}
          data-ocid="home.deck_card.recommended_tag"
        >
          <Star className="w-2 h-2 fill-current" /> Recommended
        </span>
      )}
      {/* Corner glow */}
      <div
        className="absolute top-0 right-0 w-14 h-14 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 100% 0%, oklch(0.68 0.25 180 / 0.1) 0%, transparent 70%)",
        }}
      />
      {/* Icon badge */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
        style={{
          background: "oklch(0.18 0.015 180 / 0.5)",
          border: "1px solid oklch(0.68 0.25 180 / 0.25)",
        }}
      >
        {DECK_CATEGORY_ICON[category]}
      </div>
      {/* Text */}
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-black text-sm text-foreground leading-tight">
          {DECK_CATEGORY_LABEL[category]}
        </h3>
        <p className="text-[10px] text-muted-foreground font-body mt-0.5 leading-snug line-clamp-2">
          {DECK_CATEGORY_DESCRIPTION[category]}
        </p>
      </div>
      {/* Suits row */}
      <div className="flex gap-1">
        {suits.map((s) => (
          <span
            key={s}
            className="text-[9px] text-muted-foreground/50 font-display"
          >
            {s}
          </span>
        ))}
      </div>
    </motion.button>
  );
}
