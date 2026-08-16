import type { WorkoutHistoryEntry } from "@/backend";
import { AchievementUnlockAnimation } from "@/components/AchievementUnlockAnimation";
import { Logo } from "@/components/Logo";
import { PaywallModal } from "@/components/PaywallModal";
import { Button } from "@/components/ui/button";
import { useAchievementUnlockQueue } from "@/hooks/use-achievement-unlock-queue";
import { useActor } from "@/hooks/use-local-actor";
import { getPositionIfPermitted } from "@/hooks/use-location";
import { useNotifications } from "@/hooks/use-notifications";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useTier } from "@/hooks/use-tier";
import { formatTime } from "@/hooks/use-timer";
import { getMovementCategory, useWorkout } from "@/hooks/use-workout";
import {
  buildAchievementContext,
  processSessionAchievements,
} from "@/lib/achievementEngine";
import {
  type EquipmentSnapshot,
  buildSessionRecord,
  recordSession,
  setFirstCardEverIfUnset,
} from "@/lib/achievementSessionLog";
import { checkWeeklyCardLimit } from "@/lib/cardLimit";
import {
  processWeeklyChallenge,
  setPendingChallengeCelebration,
} from "@/lib/challenge";
import { getRecommendedDifficulty } from "@/lib/recommendation";
import { updateActivityPing } from "@/lib/remoteBackend";
import { recordCompletedWorkout } from "@/lib/streak";
import { computeAvgTimePerCard, isSessionValid } from "@/lib/timeValidation";
import { type LocalSessionCard, useWorkoutStore } from "@/store/workout";
import { type Achievement, CATEGORY_META } from "@/types/achievements";
import {
  CARD_COUNT_LABEL,
  DECK_CATEGORY_LABEL,
  DECK_DIFFICULTY_LABEL,
} from "@/types/workout";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  Flame,
  Home,
  LogIn,
  RotateCcw,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Celebration particles ────────────────────────────────────────────────
function ConfettiParticle({
  delay,
  x,
  color,
  shape,
}: {
  delay: number;
  x: number;
  color: string;
  shape: "square" | "circle" | "rect";
}) {
  const sizeClass =
    shape === "rect"
      ? "w-3 h-1.5"
      : shape === "circle"
        ? "w-2 h-2 rounded-full"
        : "w-2 h-2 rounded-sm";
  return (
    <motion.div
      className={`absolute top-0 ${sizeClass} ${color}`}
      style={{ left: `${x}%` }}
      initial={{ y: -20, opacity: 1, rotate: 0, scale: 1 }}
      animate={{
        y: "110vh",
        opacity: [1, 1, 0.8, 0],
        rotate: [0, 180, 360, 540],
        scale: [1, 1.3, 0.8, 0.5],
      }}
      transition={{
        duration: 2.8 + delay * 0.3,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    />
  );
}

const CONFETTI_COLORS = [
  "bg-primary",
  "bg-yellow-400",
  "bg-orange-400",
  "bg-rose-400",
  "bg-purple-400",
  "bg-primary",
  "bg-amber-300",
  "bg-emerald-400",
];

const CONFETTI_SHAPES: ("square" | "circle" | "rect")[] = [
  "square",
  "circle",
  "rect",
];

const CONFETTI_PIECES = Array.from({ length: 48 }, (_, i) => ({
  id: i,
  x: (i * 2.1 + Math.sin(i * 37) * 8 + 100) % 100,
  delay: (i % 14) * 0.07,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  shape: CONFETTI_SHAPES[i % CONFETTI_SHAPES.length],
}));

// ─── Motivational message ─────────────────────────────────────────────────
function getMotivation(
  selectedCardCount: string | null,
  completionPct: number,
): string {
  if (completionPct === 100) {
    if (selectedCardCount === "FullDeck")
      return "LEGENDARY. You conquered the full 52-card gauntlet!";
    if (selectedCardCount === "Twenty")
      return "BEAST MODE. 20 cards down — you're unstoppable.";
    return "SOLID START. Every rep builds the foundation.";
  }
  if (completionPct >= 75) return "SO CLOSE. That's elite-level commitment.";
  if (completionPct >= 50) return "HALFWAY WARRIOR. Come back and finish it.";
  return "EVERY SET COUNTS. Rest, recover, come back stronger.";
}

// ─── Exercise breakdown ───────────────────────────────────────────────────
type SuitGroup = { label: string; count: number; emoji: string };
type ExerciseRepRow = { name: string; reps: number; suit: string };

// Purely visual — the emoji shown next to each exercise row in the "Reps
// per Exercise" list, keyed by the suit that card was actually drawn from.
// (Which suit maps to which movement — push/pull/dip/legs — varies deck by
// deck; see CATEGORY_GROUP below for the category grouping itself.)
const SUIT_GROUP: Record<string, { label: string; emoji: string }> = {
  Hearts: { label: "Hearts", emoji: "♥" },
  Diamonds: { label: "Diamonds", emoji: "♦" },
  Clubs: { label: "Clubs", emoji: "♣" },
  Spades: { label: "Spades", emoji: "♠" },
  Joker: { label: "Joker Challenges", emoji: "🃏" },
};

// "Cards by Category" groups by the exercise's *actual* movement category
// (same classifier the deck engine uses to avoid back-to-back same-movement
// cards) rather than by suit — which suit carries which movement varies by
// deck, so a suit-keyed label table would mislabel decks where e.g. Spades
// isn't the pull-up suit.
const CATEGORY_GROUP: Record<string, { label: string; emoji: string }> = {
  Push: { label: "Push Ups", emoji: "💪" },
  Pull: { label: "Pull Ups", emoji: "🧗" },
  Dip: { label: "Dips", emoji: "🔻" },
  Core: { label: "Core", emoji: "🔥" },
  Legs: { label: "Legs", emoji: "🦵" },
};

// Suit → accent color token
const SUIT_ACCENT: Record<string, string> = {
  Hearts: "oklch(0.65 0.22 25)", // red
  Spades: "oklch(0.72 0.0 260)", // light silver
  Diamonds: "oklch(0.65 0.22 25)", // red
  Clubs: "oklch(0.72 0.0 260)", // light silver
  Joker: "oklch(0.85 0.18 85)", // gold
};

function buildBreakdown(playedCards: LocalSessionCard[]): {
  suitGroups: SuitGroup[];
  exerciseRows: ExerciseRepRow[];
  totalReps: number;
  jokerCount: number;
} {
  const categoryCounts: Record<string, number> = {};
  const repMap: Record<string, { reps: number; suit: string }> = {};
  let jokerCount = 0;
  let totalReps = 0;

  for (const sc of playedCards) {
    const suit = sc.card.suit;
    if (suit === "Joker") {
      jokerCount++;
      continue;
    }
    const ex = sc.card.exercise;
    if (ex) {
      const category = getMovementCategory(ex);
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
      const reps = sc.reps ?? 0;
      if (!repMap[ex]) repMap[ex] = { reps: 0, suit };
      repMap[ex].reps += reps;
      totalReps += reps;
    }
  }

  const suitGroups: SuitGroup[] = Object.entries(categoryCounts)
    .map(([category, count]) => ({
      label: CATEGORY_GROUP[category]?.label ?? category,
      count,
      emoji: CATEGORY_GROUP[category]?.emoji ?? "•",
    }))
    .sort((a, b) => b.count - a.count);

  const exerciseRows: ExerciseRepRow[] = Object.entries(repMap)
    .map(([name, { reps, suit }]) => ({ name, reps, suit }))
    .sort((a, b) => b.reps - a.reps);

  return { suitGroups, exerciseRows, totalReps, jokerCount };
}

/**
 * Equipment achievements ("Suited Up", "Ring Master", etc.) must reflect
 * gear actually used by a completed card, not the pre-session Profile
 * toggle — a user can own a weight vest and never draw a vest-flagged card.
 * `requiresEquipment` on each played card already accounts for equipment
 * substitution (cleared when the bodyweight stand-in was used instead), so
 * this only needs to fold it into the same EquipmentSnapshot shape the
 * achievement engine expects.
 */
function buildActualEquipmentSnapshot(
  playedCards: LocalSessionCard[],
): EquipmentSnapshot {
  const snapshot: EquipmentSnapshot = {
    weightVest: false,
    resistanceBandLong: false,
    resistanceBandShort: false,
    rings: false,
  };
  for (const sc of playedCards) {
    const req = sc.card.requiresEquipment;
    if (req && req in snapshot) {
      snapshot[req] = true;
    }
  }
  return snapshot;
}

// ─── Stat card ────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  delay,
  glow,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delay: number;
  glow?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{
        background: glow
          ? "oklch(0.17 0.015 180 / 0.4)"
          : "oklch(0.16 0.01 260)",
        border: glow
          ? "1px solid oklch(0.68 0.25 180 / 0.4)"
          : "1px solid oklch(0.26 0.01 260 / 0.6)",
        boxShadow: glow ? "0 0 24px oklch(0.68 0.25 180 / 0.18)" : "none",
      }}
      data-ocid="workout-summary.stat_card"
    >
      <div
        style={{
          color: glow ? "oklch(0.68 0.25 180)" : "oklch(0.78 0.008 260)",
        }}
      >
        {icon}
      </div>
      <p className="font-display font-black text-2xl text-foreground leading-none">
        {value}
      </p>
      <p
        className="text-[10px] font-body uppercase tracking-wider"
        style={{ color: "oklch(0.78 0.008 260)" }}
      >
        {label}
      </p>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function WorkoutSummaryPage() {
  const navigate = useNavigate();
  const {
    selectedDeck,
    selectedCardCount,
    totalCards,
    workoutStartTime,
    selectedCategory,
    selectedDifficulty,
  } = useWorkoutStore();
  const guestMode = useWorkoutStore((s) => s.guestMode);
  const workoutGender = useWorkoutStore((s) => s.workoutGender);
  const { resetWorkout, getWorkoutStats } = useWorkout();
  const hasVibrated = useRef(false);
  const hasSaved = useRef(false);
  const hasRecordedStreak = useRef(false);
  const { actor } = useActor();
  const { isSubscriber, effectiveTier } = useTier();
  const { fitnessLevel, selfAssessment } = useOnboarding();
  const { settings: notifSettings, browserPermission } = useNotifications();
  const {
    current: unlockAnim,
    enqueue: enqueueUnlocks,
    handleComplete: handleUnlockComplete,
  } = useAchievementUnlockQueue();
  const [earnedThisSession, setEarnedThisSession] = useState<Achievement[]>([]);
  const [sessionValidity, setSessionValidity] = useState<{
    isValid: boolean;
    avgTimePerCard: number;
  } | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (entry: WorkoutHistoryEntry) =>
      actor!.saveWorkoutHistory(entry),
  });

  // Haptic feedback on mount
  useEffect(() => {
    if (!hasVibrated.current && navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200]);
      hasVibrated.current = true;
    }
  }, []);

  const handleNewWorkout = () => {
    resetWorkout();
    navigate({ to: "/decks" });
  };

  const handleHome = () => {
    navigate({ to: "/home" });
  };

  const stats = getWorkoutStats();
  const completedCards = stats.completedCards;
  const duration = workoutStartTime
    ? Math.floor((Date.now() - workoutStartTime) / 1000)
    : 0;
  const calories = stats.estimatedCalories;
  const hasSummary = completedCards > 0;

  // Save workout history once when the summary loads with real data
  const {
    cardHistory: savedCardHistory,
    currentCard: storeCurrentCardForSave,
  } = useWorkoutStore.getState();
  const playedForSave: LocalSessionCard[] = storeCurrentCardForSave
    ? [...savedCardHistory, storeCurrentCardForSave]
    : [...savedCardHistory];

  useEffect(() => {
    if (!hasSaved.current && hasSummary && actor && !guestMode) {
      hasSaved.current = true;
      const repsBySuit = { hearts: 0, spades: 0, clubs: 0, diamonds: 0 };
      let totalRepsCount = 0;
      for (const sc of playedForSave) {
        const suit = sc.card.suit.toLowerCase() as keyof typeof repsBySuit;
        if (suit in repsBySuit) {
          repsBySuit[suit] += sc.reps;
          totalRepsCount += sc.reps;
        }
      }
      const aceCount = playedForSave.filter(
        (sc) => sc.card.rank === "Ace",
      ).length;
      const kingCount = playedForSave.filter(
        (sc) => sc.card.rank === "King",
      ).length;
      const jokerCount = playedForSave.filter(
        (sc) => sc.card.rank === "Joker",
      ).length;
      const { exerciseRows: exerciseRowsForSave } =
        buildBreakdown(playedForSave);
      const entry: WorkoutHistoryEntry = {
        id: `${Date.now()}`,
        completedAt: BigInt(Date.now()),
        userId: "anonymous",
        deckId: selectedDeck?.id?.toString() ?? "upper-body",
        durationSeconds: BigInt(duration),
        caloriesBurned: BigInt(calories),
        cardsCompleted: BigInt(completedCards),
        totalReps: BigInt(totalRepsCount),
        aceCardsDrawn: BigInt(aceCount),
        kingCardsDrawn: BigInt(kingCount),
        jokerCardsDrawn: BigInt(jokerCount),
        repsBySuit: {
          hearts: BigInt(repsBySuit.hearts),
          spades: BigInt(repsBySuit.spades),
          clubs: BigInt(repsBySuit.clubs),
          diamonds: BigInt(repsBySuit.diamonds),
        },
        isValid: isSessionValid(duration, completedCards),
        avgTimePerCard: computeAvgTimePerCard(duration, completedCards),
        repsByExercise: exerciseRowsForSave.map((row): [string, bigint] => [
          row.name,
          BigInt(row.reps),
        ]),
      };
      saveMutation.mutate(entry);
      // Nearby-athletes activity ping — this whole block is already gated
      // to registered (non-guest) users above. Never prompts for location;
      // no-ops unless the user has opted into "Visible to nearby athletes".
      getPositionIfPermitted().then(updateActivityPing);
    }
  }, [
    calories,
    duration,
    selectedDeck,
    saveMutation,
    completedCards,
    playedForSave,
    hasSummary,
    actor,
    guestMode,
  ]);
  const completionPct =
    totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;

  // Build played cards list from cardHistory + currentCard (already resolved for ACE/KING)
  const { cardHistory: localCardHistory, currentCard: storeCurrentCard } =
    useWorkoutStore.getState();
  const playedLocalCards: LocalSessionCard[] = storeCurrentCard
    ? [...localCardHistory, storeCurrentCard]
    : [...localCardHistory];

  const cardCountKey = selectedCardCount ? String(selectedCardCount) : null;
  // Prefer the category+difficulty label (e.g. "Pro Upper Body") — the
  // current deck-selection flow (Home -> Decks -> difficulty) never sets
  // selectedDeck, only these two, so that fallback was previously always
  // the generic default regardless of what was actually played.
  const deckName =
    selectedCategory && selectedDifficulty
      ? `${DECK_DIFFICULTY_LABEL[selectedDifficulty]} ${DECK_CATEGORY_LABEL[selectedCategory]}`
      : (selectedDeck?.name ?? "Upper Body Deck");
  const deckLabel = cardCountKey
    ? (CARD_COUNT_LABEL[cardCountKey] ?? cardCountKey)
    : null;
  const motivationalMsg = getMotivation(cardCountKey, completionPct);
  const { suitGroups, exerciseRows, totalReps, jokerCount } =
    buildBreakdown(playedLocalCards);

  // Streak + achievement tracking runs for every tier, including guests —
  // unlike the detailed backend history above, which only saves for
  // logged-in users. Order matters: the streak must be recorded first so
  // the achievement engine's longest-day-streak metric reflects today.
  useEffect(() => {
    if (!hasRecordedStreak.current && hasSummary) {
      hasRecordedStreak.current = true;
      const isEmailAuth = localStorage.getItem("mbw_user") !== null;
      const isGuest = guestMode && !isEmailAuth;

      const streakResult = recordCompletedWorkout(isGuest, {
        cardsDrawn: completedCards,
        deckUsed: deckName,
        exercises: exerciseRows.map((r) => ({ name: r.name, reps: r.reps })),
      });

      const equipmentSnapshot = buildActualEquipmentSnapshot(playedLocalCards);
      const sessionRecord = buildSessionRecord({
        id: `${Date.now()}`,
        completedAt: Date.now(),
        durationSeconds: duration,
        totalCardsInSession: totalCards,
        deckCategory: selectedCategory ?? "UpperBody",
        deckDifficulty: selectedDifficulty ?? "Beginner",
        deckGender: workoutGender,
        playedCards: playedLocalCards.map((sc) => ({
          rank: sc.card.rank,
          suit: sc.card.suit,
          exercise: sc.card.exercise,
          reps: sc.reps,
        })),
        equipmentSnapshot,
      });
      const sessionsAfter = recordSession(isGuest, sessionRecord);
      if (sessionsAfter.length === 1 && playedLocalCards.length > 0) {
        const first = playedLocalCards[0]!.card;
        setFirstCardEverIfUnset(isGuest, {
          rank: first.rank,
          suit: first.suit,
        });
      }
      setSessionValidity({
        isValid: sessionRecord.isValid,
        avgTimePerCard: sessionRecord.avgTimePerCard,
      });

      const ctx = buildAchievementContext(isGuest, streakResult.data);
      const { newlyUnlocked, newlyAlmost } = processSessionAchievements(
        ctx,
        isSubscriber,
      );

      if (newlyUnlocked.length > 0) {
        setEarnedThisSession(newlyUnlocked);
        enqueueUnlocks(newlyUnlocked);
        if (browserPermission === "granted" && notifSettings.enabled) {
          for (const a of newlyUnlocked) {
            try {
              new Notification(`🏆 Achievement unlocked: ${a.name}!`, {
                body: "Open the app to see it.",
              });
            } catch {
              // Notification constructor can throw in some embedded contexts — non-fatal.
            }
          }
        }
      }
      for (const a of newlyAlmost) {
        toast(`🏆 You would have unlocked '${a.name}'!`, {
          description: "Subscribe to earn achievements.",
          duration: 5000,
        });
      }

      // Weekly challenge — reads the same fresh streak result so a
      // Consistency/Streak challenge that completes on this very session
      // reflects today's training immediately.
      const challengeResult = processWeeklyChallenge(
        isGuest,
        effectiveTier,
        {
          difficulty: getRecommendedDifficulty(fitnessLevel, selfAssessment),
          isSubscriber: effectiveTier === "subscriber",
          currentStreakWeeks: streakResult.data.current,
        },
        streakResult.data,
      );
      if (challengeResult.justCompleted) {
        setPendingChallengeCelebration(isGuest, {
          description: challengeResult.challenge.description,
          tier: effectiveTier,
        });
      }

      // This session may have just used up the last of the weekly
      // allowance — let it finish normally (already has), then paywall.
      const postSessionLimit = checkWeeklyCardLimit(effectiveTier, isGuest, 0);
      if (
        postSessionLimit.remaining !== null &&
        postSessionLimit.remaining <= 0
      ) {
        setShowPaywall(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSummary]);

  return (
    <div
      className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto relative overflow-hidden"
      data-ocid="workout-summary.page"
    >
      {unlockAnim && (
        <AchievementUnlockAnimation
          achievement={unlockAnim}
          onComplete={handleUnlockComplete}
        />
      )}
      {showPaywall && <PaywallModal onDismiss={() => setShowPaywall(false)} />}

      {/* Confetti burst */}
      {hasSummary && (
        <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
          {CONFETTI_PIECES.map((p) => (
            <ConfettiParticle
              key={p.id}
              x={p.x}
              delay={p.delay}
              color={p.color}
              shape={p.shape}
            />
          ))}
        </div>
      )}

      {/* Radial glow bg */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 45% at 50% 0%, oklch(0.68 0.25 180 / 0.13) 0%, transparent 65%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-10 pb-4">
        <Logo size="md" showIcon />
        {deckLabel && (
          <span
            className="text-[10px] font-display font-bold text-white/70 rounded-full px-3 py-1"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.6)",
            }}
          >
            {deckLabel}
          </span>
        )}
      </header>

      {/* Hero trophy + title */}
      <div className="relative z-10 flex flex-col items-center px-5 pt-2 pb-6">
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 280,
            damping: 18,
            delay: 0.1,
          }}
          className="w-24 h-24 rounded-full flex items-center justify-center mb-5"
          style={{
            background: "oklch(0.17 0.015 180 / 0.3)",
            border: "2px solid oklch(0.68 0.25 180 / 0.5)",
            boxShadow:
              "0 0 60px oklch(0.68 0.25 180 / 0.35), 0 0 120px oklch(0.68 0.25 180 / 0.1)",
          }}
        >
          <Trophy
            className="w-11 h-11"
            style={{ color: "oklch(0.68 0.25 180)" }}
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="font-display font-black text-4xl text-foreground tracking-tight mb-1 text-center"
          style={{ textShadow: "0 0 24px oklch(0.68 0.25 180 / 0.4)" }}
        >
          WORKOUT
          <br />
          <span style={{ color: "oklch(0.68 0.25 180)" }}>COMPLETE</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="font-body text-sm text-white/70 text-center"
        >
          {deckName}
        </motion.p>
      </div>

      {/* Motivational banner */}
      {hasSummary && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="relative z-10 mx-5 mb-6 rounded-2xl px-5 py-4 flex items-center gap-3"
          style={{
            background: "oklch(0.17 0.015 180 / 0.4)",
            border: "1px solid oklch(0.68 0.25 180 / 0.3)",
          }}
          data-ocid="workout-summary.motivation_banner"
        >
          <Sparkles
            className="w-5 h-5 shrink-0"
            style={{ color: "oklch(0.68 0.25 180)" }}
          />
          <p
            className="font-display font-bold text-sm leading-snug"
            style={{ color: "oklch(0.68 0.25 180)" }}
          >
            {motivationalMsg}
          </p>
        </motion.div>
      )}

      {/* Time-validation warning — session too quick to count toward achievements */}
      {hasSummary && sessionValidity && !sessionValidity.isValid && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.4 }}
          className="relative z-10 mx-5 mb-6 rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{
            background: "oklch(0.2 0.05 60 / 0.15)",
            border: "1px solid oklch(0.75 0.16 60 / 0.4)",
          }}
          data-ocid="workout-summary.invalid_session_warning"
        >
          <Zap
            className="w-4 h-4 shrink-0"
            style={{ color: "oklch(0.75 0.16 60)" }}
          />
          <p
            className="font-body text-xs leading-snug"
            style={{ color: "oklch(0.85 0.1 60)" }}
          >
            This session was completed too quickly to count toward achievements.
          </p>
        </motion.div>
      )}

      {/* Stats grid */}
      <div className="relative z-10 px-5 grid grid-cols-2 gap-3 mb-6">
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Cards Completed"
          value={hasSummary ? `${completedCards} / ${totalCards}` : "—"}
          delay={0.42}
          glow
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Total Duration"
          value={hasSummary ? formatTime(duration) : "—"}
          delay={0.48}
        />
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="Est. Calories"
          value={hasSummary ? `${calories} kcal` : "—"}
          delay={0.54}
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Completion"
          value={hasSummary ? `${completionPct}%` : "—"}
          delay={0.6}
        />
      </div>

      {/* Reps per Exercise — detailed breakdown */}
      {exerciseRows.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5 }}
          className="relative z-10 mx-5 mb-6"
          data-ocid="workout-summary.reps_section"
        >
          <p className="font-display font-bold text-[10px] uppercase tracking-widest mb-3 text-muted-foreground">
            Reps per Exercise
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.5)",
            }}
          >
            {exerciseRows.map((row, i) => (
              <div
                key={row.name}
                className="flex items-center justify-between px-5 py-3.5"
                style={{
                  borderBottom:
                    i < exerciseRows.length - 1
                      ? "1px solid oklch(0.22 0.01 260 / 0.5)"
                      : "none",
                }}
                data-ocid={`workout-summary.exercise.item.${i + 1}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base w-5 text-center shrink-0">
                    {SUIT_GROUP[row.suit]?.emoji ?? "•"}
                  </span>
                  <span className="font-body text-sm text-foreground truncate">
                    {row.name}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 shrink-0 ml-3">
                  <span
                    className="font-display font-black text-lg leading-none"
                    style={{
                      color: SUIT_ACCENT[row.suit] ?? "oklch(0.68 0.25 180)",
                    }}
                  >
                    {row.reps}
                  </span>
                  <span
                    className="font-body text-[10px] uppercase tracking-wide"
                    style={{ color: "oklch(0.75 0.008 260)" }}
                  >
                    reps
                  </span>
                </div>
              </div>
            ))}
            {/* Total reps footer */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{
                borderTop: "1px solid oklch(0.26 0.01 260 / 0.6)",
                background: "oklch(0.17 0.015 180 / 0.2)",
              }}
              data-ocid="workout-summary.total_reps"
            >
              <span
                className="font-display font-bold text-xs uppercase tracking-widest"
                style={{ color: "oklch(0.78 0.008 260)" }}
              >
                Total Reps
              </span>
              <div className="flex items-baseline gap-1">
                <span
                  className="font-display font-black text-2xl leading-none"
                  style={{ color: "oklch(0.68 0.25 180)" }}
                >
                  {totalReps}
                </span>
                <span
                  className="font-body text-[10px] uppercase tracking-wide"
                  style={{ color: "oklch(0.75 0.008 260)" }}
                >
                  reps
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Cards per category */}
      {suitGroups.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.5 }}
          className="relative z-10 mx-5 mb-6"
          data-ocid="workout-summary.category_section"
        >
          <p className="font-display font-bold text-[10px] uppercase tracking-widest mb-3 text-muted-foreground">
            Cards by Category
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.5)",
            }}
          >
            {suitGroups.map((g, i) => (
              <div
                key={g.label}
                className="flex items-center justify-between px-5 py-3.5"
                style={{
                  borderBottom:
                    i < suitGroups.length - 1
                      ? "1px solid oklch(0.22 0.01 260 / 0.5)"
                      : "none",
                }}
                data-ocid={`workout-summary.category.item.${i + 1}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center">{g.emoji}</span>
                  <span className="font-body text-sm text-foreground">
                    {g.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className="font-display font-black text-base leading-none"
                    style={{ color: "oklch(0.68 0.25 180)" }}
                  >
                    {g.count}
                  </span>
                  <span
                    className="font-body text-[10px] uppercase tracking-wide"
                    style={{ color: "oklch(0.75 0.008 260)" }}
                  >
                    cards
                  </span>
                </div>
              </div>
            ))}
            {jokerCount > 0 && (
              <div
                className="flex items-center justify-between px-5 py-3.5"
                style={{
                  borderTop:
                    suitGroups.length > 0
                      ? "1px solid oklch(0.22 0.01 260 / 0.5)"
                      : "none",
                }}
                data-ocid="workout-summary.joker_count"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center">🃏</span>
                  <span className="font-body text-sm text-foreground">
                    Joker Challenges
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-black text-base leading-none text-yellow-400">
                    {jokerCount}
                  </span>
                  <span
                    className="font-body text-[10px] uppercase tracking-wide"
                    style={{ color: "oklch(0.75 0.008 260)" }}
                  >
                    cards
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Achievements earned this session — hidden entirely when none unlocked */}
      {earnedThisSession.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.5 }}
          className="relative z-10 mx-5 mb-6"
          data-ocid="workout-summary.achievements_earned_section"
        >
          <p className="font-display font-bold text-[10px] uppercase tracking-widest mb-3 text-muted-foreground">
            Achievements Earned This Session
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "oklch(0.17 0.015 180 / 0.25)",
              border: "1px solid oklch(0.68 0.25 180 / 0.35)",
            }}
          >
            {earnedThisSession.map((a, i) => (
              <div
                key={a.id}
                className="flex items-center gap-3 px-5 py-3.5"
                style={{
                  borderBottom:
                    i < earnedThisSession.length - 1
                      ? "1px solid oklch(0.22 0.01 260 / 0.5)"
                      : "none",
                }}
                data-ocid={`workout-summary.achievement_earned.${i + 1}`}
              >
                <span className="text-xl w-7 text-center shrink-0">
                  {CATEGORY_META[a.category].emoji}
                </span>
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm text-foreground truncate">
                    {a.name}
                  </p>
                  <p className="font-body text-xs text-white/60 truncate">
                    {a.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {!hasSummary && (
        <div
          className="relative z-10 mx-5 mb-6 rounded-2xl p-8 text-center"
          style={{
            background: "oklch(0.16 0.01 260)",
            border: "1px solid oklch(0.26 0.01 260 / 0.4)",
          }}
          data-ocid="workout-summary.empty_state"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "oklch(0.68 0.25 180 / 0.1)" }}
          >
            <Trophy
              className="w-7 h-7"
              style={{ color: "oklch(0.68 0.25 180 / 0.5)" }}
            />
          </div>
          <p className="font-display font-bold text-sm text-foreground mb-1">
            No workout yet
          </p>
          <p className="text-white/70 font-body text-xs">
            Complete a workout to see your statistics here.
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div
        className="relative z-10 px-5 pb-10 mt-auto flex flex-col gap-3"
        data-ocid="workout-summary.actions"
      >
        {guestMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.4 }}
            className="rounded-2xl px-5 py-4 flex items-center gap-3 cursor-pointer"
            style={{
              background: "oklch(0.17 0.015 260 / 0.6)",
              border: "1px solid oklch(0.45 0.12 260 / 0.5)",
            }}
            onClick={() => navigate({ to: "/onboarding/auth" })}
            data-ocid="workout-summary.guest_signin_banner"
          >
            <LogIn
              className="w-5 h-5 shrink-0"
              style={{ color: "oklch(0.75 0.18 260)" }}
            />
            <div className="min-w-0">
              <p className="font-display font-bold text-sm text-white leading-snug">
                Sign in to save your progress
              </p>
              <p className="font-body text-xs text-white/60 mt-0.5">
                Your workout won't be saved in guest mode.
              </p>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.72, duration: 0.45 }}
          whileTap={{ scale: 0.97 }}
        >
          <Button
            className="w-full h-14 font-display font-black text-xl tracking-widest rounded-2xl"
            style={{
              boxShadow:
                "0 0 40px oklch(0.68 0.25 180 / 0.35), 0 4px 20px oklch(0 0 0 / 0.3)",
            }}
            onClick={handleNewWorkout}
            data-ocid="workout-summary.new_workout_button"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            NEW WORKOUT
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          whileTap={{ scale: 0.97 }}
        >
          <Button
            variant="outline"
            className="w-full h-14 font-display font-black text-xl tracking-widest rounded-2xl hover:border-primary/40"
            style={{
              background: "oklch(0.16 0.01 260 / 0.8)",
              border: "1px solid oklch(0.38 0.01 260 / 0.8)",
            }}
            onClick={handleHome}
            data-ocid="workout-summary.home_button"
          >
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
