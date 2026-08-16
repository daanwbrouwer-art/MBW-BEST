import { type Card, CardCount, Rank, type RepSpec, Suit } from "@/backend";
import { Logo } from "@/components/Logo";
import { PaywallModal } from "@/components/PaywallModal";
import { PlayingCard } from "@/components/PlayingCard";
import { RegisterPromptModal } from "@/components/RegisterPromptModal";
import { Button } from "@/components/ui/button";
import { resolveExerciseIllustration } from "@/data/exerciseAssets";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useTier } from "@/hooks/use-tier";
import {
  type SuitExerciseEntry,
  type WorkoutGender,
  cardCountToNumber,
  estimateDeckAverageCaloriesPerCard,
  getDeckExerciseConfig,
  getDeckExerciseList,
  getMovementCategory,
  reorderNoConsecutiveCategories,
  useWorkout,
} from "@/hooks/use-workout";
import { setPatienceFlag } from "@/lib/achievementSessionLog";
import {
  checkWeeklyCardLimit,
  isCardCountLocked,
  isDifficultyLocked,
  unlockTierForCardCount,
} from "@/lib/cardLimit";
import { cn } from "@/lib/utils";
import { useWorkoutStore } from "@/store/workout";
import {
  DECK_CATEGORY_LABEL,
  DECK_DIFFICULTY_LABEL,
  type DeckCategory,
  type DeckDifficulty,
} from "@/types/workout";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Clock,
  Filter,
  Flame,
  Info,
  Pause,
  Play,
  Shuffle,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

const CARD_COUNTS = [
  {
    value: CardCount.Ten,
    label: "10 Cards",
    badge: "QUICK",
    sub: "Quick Session",
    time: "~20 min",
    calories: "~120 cal",
    badgeStyle: {
      background: "oklch(0.65 0.18 160 / 0.2)",
      color: "oklch(0.65 0.18 160)",
    },
  },
  {
    value: CardCount.Twenty,
    label: "20 Cards",
    badge: "STANDARD",
    sub: "Standard Workout",
    time: "~40 min",
    calories: "~240 cal",
    badgeStyle: {
      background: "oklch(0.68 0.25 180 / 0.2)",
      color: "oklch(0.68 0.25 180)",
    },
  },
  {
    value: CardCount.FullDeck,
    label: "52 Cards",
    badge: "FULL CHALLENGE",
    sub: "Complete Gauntlet",
    time: "~90 min",
    calories: "~550 cal",
    badgeStyle: {
      background: "oklch(0.65 0.22 40 / 0.2)",
      color: "oklch(0.65 0.22 40)",
    },
  },
];

export default function WorkoutSetupPage() {
  const navigate = useNavigate();
  const {
    selectedDeck,
    selectedCategory,
    selectedDifficulty,
    selectedCardCount,
    setSelectedCardCount,
    isShuffling,
    excludedExercises,
    toggleExcludeExercise,
  } = useWorkoutStore();
  const { startWorkout } = useWorkout();
  const { gender: onboardingGender, weightKg, age, heightCm } = useOnboarding();
  const workoutGender = onboardingGender ?? "male";

  // Same per-exercise-type formula the post-workout summary uses (see
  // src/lib/calories.ts), averaged across this deck's actual exercise mix
  // so the pre-workout estimate isn't a disconnected, hand-tuned guess.
  const caloriesPerCard = useMemo(
    () =>
      estimateDeckAverageCaloriesPerCard(
        selectedCategory ?? "UpperBody",
        selectedDifficulty ?? "Beginner",
        workoutGender,
        weightKg ?? undefined,
        age ?? undefined,
        heightCm ?? undefined,
      ),
    [
      selectedCategory,
      selectedDifficulty,
      workoutGender,
      weightKg,
      age,
      heightCm,
    ],
  );
  const { effectiveTier, guestMode: isGuest } = useTier();
  const [showExcludeModal, setShowExcludeModal] = useState(false);
  const [showExercisePreview, setShowExercisePreview] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [registerPrompt, setRegisterPrompt] = useState<{
    title: string;
    body: string;
  } | null>(null);

  // "Patience" secret achievement — lingering on this pre-workout screen for
  // 60s without ever pressing Start. Cleared on unmount, so starting before
  // the timer fires (the normal case) never triggers it.
  const hasStartedRef = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasStartedRef.current) setPatienceFlag(isGuest);
    }, 60_000);
    return () => clearTimeout(timer);
  }, [isGuest]);

  // Derive the displayed deck name from category+difficulty or fall back to selectedDeck
  const deckDisplayName = (() => {
    if (selectedCategory && selectedDifficulty) {
      return `${DECK_CATEGORY_LABEL[selectedCategory]} — ${DECK_DIFFICULTY_LABEL[selectedDifficulty]}`;
    }
    if (selectedDeck?.name) return selectedDeck.name;
    return "No deck selected";
  })();

  // Derive the exercise pool for the selected deck+difficulty directly from
  // the data. Previously this was hardcoded to treat Core/FullBody as empty,
  // which became stale once those decks were populated. Now any deck without
  // exercise content simply yields an empty list naturally.
  const deckExercises =
    !selectedCategory || !selectedDifficulty
      ? []
      : getDeckExerciseList(
          selectedCategory,
          selectedDifficulty,
          workoutGender,
        );
  const excludedCount = excludedExercises.length;

  const [customInput, setCustomInput] = useState("");
  const [customError, setCustomError] = useState("");
  const [isCustomSelected, setIsCustomSelected] = useState(false);

  const handleCustomChange = (val: string) => {
    setCustomInput(val);
    if (val === "") {
      setCustomError("");
      return;
    }
    const n = Number(val);
    if (!Number.isInteger(n) || n < 2 || n > 52) {
      setCustomError("Enter a number between 2 and 52");
    } else {
      setCustomError("");
    }
  };

  const promptForLockedCardCount = (
    value: (typeof CARD_COUNTS)[number]["value"] | "Custom",
    label: string,
  ) => {
    const unlockTier = unlockTierForCardCount(value);
    if (unlockTier === "registered" && isGuest) {
      setRegisterPrompt({
        title: "Free Account Required",
        body: `${label} requires a free account. Register now — it only takes a few seconds.`,
      });
    } else {
      setShowPaywall(true);
    }
  };

  const handlePresetSelect = (
    value: (typeof CARD_COUNTS)[number]["value"],
    label: string,
  ) => {
    if (isCardCountLocked(value, effectiveTier)) {
      promptForLockedCardCount(value, label);
      return;
    }
    setIsCustomSelected(false);
    setCustomInput("");
    setCustomError("");
    setSelectedCardCount(value);
  };

  const handleCustomFocus = () => {
    if (isCardCountLocked("Custom", effectiveTier)) {
      promptForLockedCardCount("Custom", "Custom card counts");
      return;
    }
    setIsCustomSelected(true);
    setSelectedCardCount(null);
  };

  const customLocked = isCardCountLocked("Custom", effectiveTier);
  const customCountNum =
    customInput !== "" && !customError ? Number(customInput) : null;
  const canStart =
    !isShuffling &&
    (isCustomSelected ? customCountNum !== null : selectedCardCount !== null);

  const requestedCardCount = isCustomSelected
    ? (customCountNum ?? 0)
    : selectedCardCount === CardCount.Ten
      ? 10
      : selectedCardCount === CardCount.Twenty
        ? 20
        : selectedCardCount === CardCount.FullDeck
          ? 52
          : 0;

  // Reactive limit preview — drives the inline "you have N cards left"
  // warning as soon as a too-large size is selected, not just on submit.
  const limitPreview = checkWeeklyCardLimit(
    effectiveTier,
    isGuest,
    requestedCardCount,
  );
  const remainingCards = limitPreview.remaining;
  const showLowCardsWarning =
    remainingCards !== null &&
    remainingCards > 0 &&
    requestedCardCount > 0 &&
    remainingCards < requestedCardCount;

  const handleStart = async () => {
    // Allow starting with either a legacy selectedDeck OR a category+difficulty selection
    if (!selectedDeck && !selectedCategory) return;
    if (isShuffling) return;

    // Defensive: closes the Home screen's "Recommended" quick-start shortcut,
    // which sets category+difficulty directly and can bypass DecksPage's own
    // difficulty lock check.
    if (
      selectedDifficulty &&
      isDifficultyLocked(selectedDifficulty, effectiveTier)
    ) {
      setShowPaywall(true);
      return;
    }

    // Already out of cards for the week — block entering a new session
    // entirely and go straight to the upgrade screen. Being merely *short*
    // of the requested amount (remainingCards > 0) is allowed through with
    // just the inline warning above — the session finishes on whatever
    // allowance remains.
    if (remainingCards !== null && remainingCards <= 0) {
      setShowPaywall(true);
      return;
    }
    hasStartedRef.current = true;

    if (isCustomSelected && customCountNum !== null) {
      await startWorkout(customCountNum, workoutGender);
      return;
    }
    if (!selectedCardCount) return;
    await startWorkout(undefined, workoutGender);
  };

  return (
    <>
      <div
        className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto"
        data-ocid="workout-setup.page"
      >
        {/* Ambient gradient */}
        <div
          className="pointer-events-none fixed inset-0 max-w-[430px] mx-auto"
          style={{
            background:
              "radial-gradient(ellipse 70% 35% at 50% 0%, oklch(0.22 0.04 180 / 0.16) 0%, transparent 65%)",
          }}
        />

        {/* Header */}
        <header className="relative flex items-center gap-3 px-5 pt-12 pb-5">
          <motion.button
            type="button"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => navigate({ to: "/decks" })}
            className="w-10 h-10 rounded-xl bg-card border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/45 transition-smooth"
            data-ocid="workout-setup.back_button"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex-1 min-w-0"
          >
            <h1 className="font-display font-black text-xl text-foreground tracking-tight">
              Workout Setup
            </h1>
            <div className="flex items-center gap-1">
              <p className="text-xs text-muted-foreground font-body truncate">
                {deckDisplayName}
              </p>
              <button
                type="button"
                onClick={() => setShowExercisePreview(true)}
                className="ml-1 p-1 rounded-full hover:bg-white/10 transition-colors shrink-0"
                aria-label="View exercises"
                data-ocid="workout-setup.exercise_preview_button"
              >
                <Info className="w-4 h-4 text-[#2dd4a0]" />
              </button>
            </div>
          </motion.div>
          <Logo size="sm" iconOnly className="opacity-70 shrink-0" />
        </header>

        {/* Motivational tagline */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-5 mb-6"
        >
          <p
            className="font-display font-black text-xs tracking-[0.28em] uppercase"
            style={{ color: "oklch(0.68 0.25 180)" }}
          >
            SHUFFLE. DRAW. CONQUER.
          </p>
        </motion.div>

        {/* Card visual / Idle shuffle preview */}
        <div className="flex justify-center px-5 mb-7">
          <IdleShufflePreview
            category={selectedCategory}
            difficulty={selectedDifficulty}
            gender={workoutGender}
          />
        </div>

        {/* Card count selection */}
        <div className="px-5 mb-6">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="font-display font-bold text-sm uppercase tracking-widest text-muted-foreground mb-3"
          >
            Select Workout Size
          </motion.h2>
          <div className="flex flex-col gap-3">
            {CARD_COUNTS.map(
              (
                {
                  value,
                  label,
                  badge,
                  sub,
                  time,
                  calories: staticCalories,
                  badgeStyle,
                },
                i,
              ) => {
                const calories =
                  caloriesPerCard > 0
                    ? `~${Math.round(caloriesPerCard * cardCountToNumber(value))} cal`
                    : staticCalories;
                const isSelected =
                  !isCustomSelected && selectedCardCount === value;
                const locked = isCardCountLocked(value, effectiveTier);
                const unlockLabel =
                  unlockTierForCardCount(value) === "registered"
                    ? "Register free to unlock"
                    : "Subscribe to unlock";
                return (
                  <motion.button
                    key={value}
                    type="button"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.18 + i * 0.07,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handlePresetSelect(value, label)}
                    className="w-full text-left rounded-2xl border transition-smooth relative overflow-hidden"
                    style={{
                      background: locked
                        ? "oklch(0.14 0.01 260)"
                        : isSelected
                          ? "oklch(0.17 0.015 180 / 0.5)"
                          : "oklch(0.16 0.01 260)",
                      borderColor: locked
                        ? "oklch(0.28 0.01 260 / 0.5)"
                        : isSelected
                          ? "oklch(0.68 0.25 180 / 0.6)"
                          : "oklch(0.26 0.01 260 / 0.6)",
                      boxShadow:
                        isSelected && !locked
                          ? "0 0 28px oklch(0.68 0.25 180 / 0.2), inset 0 1px 0 oklch(0.68 0.25 180 / 0.1)"
                          : "none",
                    }}
                    data-ocid={`workout-setup.card-count.item.${i + 1}`}
                  >
                    {isSelected && !locked && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            "radial-gradient(ellipse at 0% 50%, oklch(0.68 0.25 180 / 0.08) 0%, transparent 70%)",
                        }}
                      />
                    )}

                    {locked && (
                      <div
                        className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{
                          background: "oklch(0.3 0.01 260 / 0.6)",
                          border: "1px solid oklch(0.4 0.01 260 / 0.6)",
                        }}
                        data-ocid={`workout-setup.card-count.item.${i + 1}.lock_icon`}
                      >
                        <span className="text-xs" aria-hidden="true">
                          🔒
                        </span>
                      </div>
                    )}

                    <div className="relative flex items-center gap-4 p-4">
                      {/* Selector radio */}
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-smooth",
                        )}
                        style={{
                          borderColor:
                            isSelected && !locked
                              ? "oklch(0.68 0.25 180)"
                              : "oklch(0.38 0.01 260)",
                          background:
                            isSelected && !locked
                              ? "oklch(0.68 0.25 180)"
                              : "transparent",
                        }}
                      >
                        {isSelected && !locked && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-2 h-2 rounded-full"
                            style={{ background: "oklch(0.12 0.008 260)" }}
                          />
                        )}
                      </div>

                      {/* Text content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="font-display font-black text-lg leading-none"
                            style={{
                              color: locked
                                ? "oklch(0.5 0.01 260)"
                                : isSelected
                                  ? "oklch(0.68 0.25 180)"
                                  : "oklch(0.92 0.01 260)",
                            }}
                          >
                            {label}
                          </span>
                          {!locked && (
                            <span
                              className="text-[10px] font-display font-black tracking-widest px-2 py-0.5 rounded"
                              style={
                                isSelected
                                  ? badgeStyle
                                  : {
                                      background: "oklch(0.22 0.01 260 / 0.8)",
                                      color: "oklch(0.55 0.008 260)",
                                    }
                              }
                            >
                              {badge}
                            </span>
                          )}
                        </div>
                        {locked ? (
                          <p
                            className="text-[11px] font-display font-bold uppercase tracking-wide"
                            style={{ color: "oklch(0.68 0.25 180)" }}
                            data-ocid={`workout-setup.card-count.item.${i + 1}.unlock_label`}
                          >
                            {unlockLabel}
                          </p>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground font-body">
                              {sub}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-body">
                              <Clock className="w-3 h-3" />
                              {time}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Calories chip */}
                      {!locked && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Flame
                            className="w-3.5 h-3.5"
                            style={{
                              color: isSelected
                                ? "oklch(0.68 0.25 180)"
                                : "oklch(0.55 0.008 260)",
                            }}
                          />
                          <span
                            className="text-xs font-display font-bold"
                            style={{
                              color: isSelected
                                ? "oklch(0.68 0.25 180)"
                                : "oklch(0.55 0.008 260)",
                            }}
                          >
                            {calories}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              },
            )}

            {/* Custom card count */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.39, ease: [0.16, 1, 0.3, 1] }}
              onClick={handleCustomFocus}
              className="w-full rounded-2xl border transition-smooth relative overflow-hidden cursor-pointer"
              style={{
                background: customLocked
                  ? "oklch(0.14 0.01 260)"
                  : isCustomSelected
                    ? "oklch(0.17 0.015 180 / 0.5)"
                    : "oklch(0.16 0.01 260)",
                borderColor: customLocked
                  ? "oklch(0.28 0.01 260 / 0.5)"
                  : customError
                    ? "oklch(0.65 0.22 25 / 0.7)"
                    : isCustomSelected
                      ? "oklch(0.68 0.25 180 / 0.6)"
                      : "oklch(0.26 0.01 260 / 0.6)",
                boxShadow:
                  isCustomSelected && !customError && !customLocked
                    ? "0 0 28px oklch(0.68 0.25 180 / 0.2), inset 0 1px 0 oklch(0.68 0.25 180 / 0.1)"
                    : customError && !customLocked
                      ? "0 0 16px oklch(0.65 0.22 25 / 0.15)"
                      : "none",
              }}
              data-ocid="workout-setup.card-count.custom"
            >
              {isCustomSelected && !customError && !customLocked && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(ellipse at 0% 50%, oklch(0.68 0.25 180 / 0.08) 0%, transparent 70%)",
                  }}
                />
              )}
              {customLocked && (
                <div
                  className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    background: "oklch(0.3 0.01 260 / 0.6)",
                    border: "1px solid oklch(0.4 0.01 260 / 0.6)",
                  }}
                  data-ocid="workout-setup.card-count.custom.lock_icon"
                >
                  <span className="text-xs" aria-hidden="true">
                    🔒
                  </span>
                </div>
              )}
              <div className="relative flex items-center gap-4 p-4">
                {/* Selector radio */}
                <button
                  type="button"
                  className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-smooth bg-transparent"
                  onClick={handleCustomFocus}
                  style={{
                    borderColor: customError
                      ? "oklch(0.65 0.22 25)"
                      : isCustomSelected
                        ? "oklch(0.68 0.25 180)"
                        : "oklch(0.38 0.01 260)",
                    background:
                      isCustomSelected && !customError
                        ? "oklch(0.68 0.25 180)"
                        : "transparent",
                  }}
                >
                  {isCustomSelected && !customError && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 rounded-full"
                      style={{ background: "oklch(0.12 0.008 260)" }}
                    />
                  )}
                </button>

                {/* Label + input */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="font-display font-black text-lg leading-none"
                      style={{
                        color:
                          isCustomSelected && !customError
                            ? "oklch(0.68 0.25 180)"
                            : customError
                              ? "oklch(0.65 0.22 25)"
                              : "oklch(0.92 0.01 260)",
                      }}
                    >
                      Custom
                    </span>
                    <span
                      className="text-[10px] font-display font-black tracking-widest px-2 py-0.5 rounded"
                      style={{
                        background: "oklch(0.22 0.01 260 / 0.8)",
                        color: "oklch(0.55 0.008 260)",
                      }}
                    >
                      YOUR CHOICE
                    </span>
                  </div>
                  {customLocked ? (
                    <p
                      className="text-[11px] font-display font-bold uppercase tracking-wide"
                      style={{ color: "oklch(0.68 0.25 180)" }}
                      data-ocid="workout-setup.card-count.custom.unlock_label"
                    >
                      Subscribe to unlock
                    </p>
                  ) : (
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={2}
                        max={52}
                        value={customInput}
                        onFocus={handleCustomFocus}
                        onChange={(e) => handleCustomChange(e.target.value)}
                        placeholder="2 – 52 cards"
                        className="w-32 h-8 rounded-lg px-3 font-display font-bold text-sm text-foreground outline-none transition-smooth"
                        style={{
                          background: "oklch(0.12 0.008 260)",
                          border: `1px solid ${
                            customError
                              ? "oklch(0.65 0.22 25 / 0.7)"
                              : isCustomSelected
                                ? "oklch(0.68 0.25 180 / 0.5)"
                                : "oklch(0.30 0.01 260 / 0.6)"
                          }`,
                        }}
                        data-ocid="workout-setup.custom_count_input"
                      />
                      {customError ? (
                        <span
                          className="text-[10px] font-body"
                          style={{ color: "oklch(0.65 0.22 25)" }}
                        >
                          {customError}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-body">
                          Any amount
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Exclude Exercises button */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className="px-5 mb-4"
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowExcludeModal(true)}
            className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-display font-black text-sm tracking-widest transition-smooth relative overflow-hidden"
            style={{
              background: "oklch(0.14 0.01 260)",
              border: `1.5px solid ${excludedCount > 0 ? "oklch(0.68 0.25 180 / 0.9)" : "oklch(0.68 0.25 180 / 0.35)"}`,
              color:
                excludedCount > 0
                  ? "oklch(0.68 0.25 180)"
                  : "oklch(0.82 0.01 260)",
              boxShadow:
                excludedCount > 0
                  ? "0 0 20px oklch(0.68 0.25 180 / 0.18), inset 0 1px 0 oklch(0.68 0.25 180 / 0.1)"
                  : "none",
            }}
            data-ocid="workout-setup.exclude_exercises_button"
          >
            <Filter className="w-4 h-4" />
            EXCLUDE EXERCISES
            {excludedCount > 0 && (
              <span
                className="ml-1 px-2 py-0.5 rounded-full font-display font-black text-[10px] tracking-widest"
                style={{
                  background: "oklch(0.68 0.25 180 / 0.2)",
                  color: "oklch(0.68 0.25 180)",
                  border: "1px solid oklch(0.68 0.25 180 / 0.4)",
                }}
              >
                {excludedCount} excluded
              </span>
            )}
          </motion.button>
        </motion.div>

        {/* Low weekly allowance warning — session is still allowed to proceed */}
        {showLowCardsWarning && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-5 mb-4 rounded-2xl px-4 py-3 flex items-start gap-3"
            style={{
              background: "oklch(0.2 0.05 60 / 0.15)",
              border: "1px solid oklch(0.75 0.16 60 / 0.4)",
            }}
            data-ocid="workout-setup.low_cards_warning"
          >
            <Zap
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: "oklch(0.75 0.16 60)" }}
            />
            <p
              className="text-xs font-body leading-snug"
              style={{ color: "oklch(0.85 0.1 60)" }}
            >
              You have {remainingCards}{" "}
              {remainingCards === 1 ? "card" : "cards"} left this week. This
              session will use your remaining allowance.
            </p>
          </motion.div>
        )}

        {/* Start button */}
        <div className="px-5 pb-10 mt-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <Button
              className="w-full h-14 font-display font-black text-xl tracking-widest rounded-2xl disabled:shadow-none disabled:opacity-30 transition-smooth"
              style={{
                boxShadow: canStart
                  ? "0 0 40px oklch(0.68 0.25 180 / 0.35), 0 4px 20px oklch(0 0 0 / 0.3)"
                  : "none",
              }}
              disabled={!canStart}
              onClick={handleStart}
              data-ocid="workout-setup.start_button"
            >
              {isShuffling ? (
                <span className="flex items-center gap-2">
                  <Shuffle className="w-5 h-5 animate-spin" />
                  Shuffling...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  START WORKOUT
                </span>
              )}
            </Button>
            {!canStart && !isShuffling && (
              <p className="text-center text-xs text-muted-foreground font-body mt-3">
                Select a workout size above
              </p>
            )}
          </motion.div>
        </div>
      </div>

      {/* Exclude Exercises Modal */}
      <AnimatePresence>
        {showExcludeModal && (
          <ExcludeExercisesModal
            exercises={deckExercises}
            excludedExercises={excludedExercises}
            cardCount={
              isCustomSelected && customCountNum !== null
                ? customCountNum
                : selectedCardCount === CardCount.Ten
                  ? 10
                  : selectedCardCount === CardCount.Twenty
                    ? 20
                    : 52
            }
            onToggle={toggleExcludeExercise}
            onExcludeAll={() => {
              for (const ex of deckExercises) {
                if (!excludedExercises.includes(ex)) toggleExcludeExercise(ex);
              }
            }}
            onIncludeAll={() => {
              for (const ex of [...excludedExercises])
                toggleExcludeExercise(ex);
            }}
            onClose={() => setShowExcludeModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Exercise Preview Modal */}
      <AnimatePresence>
        {showExercisePreview && (
          <ExercisePreviewModal
            exercises={deckExercises}
            deckName={deckDisplayName}
            onClose={() => setShowExercisePreview(false)}
          />
        )}
      </AnimatePresence>

      {/* Weekly limit reached / locked-feature paywall */}
      <AnimatePresence>
        {showPaywall && (
          <PaywallModal onDismiss={() => setShowPaywall(false)} />
        )}
      </AnimatePresence>

      {/* Free-account-unlocks-this prompt (e.g. guest tapping 20 cards) */}
      <AnimatePresence>
        {registerPrompt && (
          <RegisterPromptModal
            title={registerPrompt.title}
            body={registerPrompt.body}
            onClose={() => setRegisterPrompt(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// --- Exercise Preview Modal ---

function ExercisePreviewModal({
  exercises,
  deckName,
  onClose,
}: {
  exercises: string[];
  deckName: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center max-w-[430px] mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ background: "oklch(0.06 0.008 260 / 0.85)" }}
        onClick={onClose}
      />
      <motion.div
        className="relative flex flex-col rounded-2xl overflow-hidden w-[85%] max-w-[360px]"
        style={{
          background: "oklch(0.13 0.012 260)",
          border: "1.5px solid oklch(0.26 0.01 260 / 0.8)",
          boxShadow: "0 16px 60px oklch(0 0 0 / 0.5)",
          maxHeight: "70dvh",
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid oklch(0.22 0.01 260 / 0.6)" }}
        >
          <div>
            <h2
              className="font-display font-black text-base tracking-widest uppercase"
              style={{ color: "oklch(0.95 0.01 260)" }}
            >
              Exercises in this deck
            </h2>
            <p
              className="text-xs font-body mt-0.5"
              style={{ color: "oklch(0.55 0.008 260)" }}
            >
              {deckName}
            </p>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-smooth"
            style={{
              background: "oklch(0.20 0.01 260)",
              border: "1px solid oklch(0.28 0.01 260 / 0.6)",
              color: "oklch(0.65 0.008 260)",
            }}
            data-ocid="exercise-preview.close_button"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {exercises.length === 0 ? (
            <p
              className="text-sm font-body text-center py-8"
              style={{ color: "oklch(0.55 0.008 260)" }}
            >
              No exercises found for this deck.
            </p>
          ) : (
            <ul className="space-y-2">
              {exercises.map((exercise, i) => (
                <li
                  key={exercise}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl"
                  style={{
                    background: "oklch(0.16 0.01 260)",
                    border: "1px solid oklch(0.22 0.01 260 / 0.6)",
                  }}
                  data-ocid={`exercise-preview.item.${i + 1}`}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center font-display font-black text-[10px] shrink-0"
                    style={{
                      background: "oklch(0.68 0.25 180 / 0.15)",
                      color: "oklch(0.68 0.25 180)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="font-display font-bold text-sm tracking-wide"
                    style={{ color: "oklch(0.92 0.01 260)" }}
                  >
                    {exercise}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className="px-5 py-4 shrink-0"
          style={{ borderTop: "1px solid oklch(0.20 0.01 260 / 0.6)" }}
        >
          <Button
            className="w-full h-12 font-display font-black text-base tracking-widest rounded-2xl"
            style={{
              boxShadow:
                "0 0 32px oklch(0.68 0.25 180 / 0.3), 0 4px 16px oklch(0 0 0 / 0.3)",
            }}
            onClick={onClose}
            data-ocid="exercise-preview.done_button"
          >
            DONE
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Exclude Exercises Modal ---

function ExcludeExercisesModal({
  exercises,
  excludedExercises,
  cardCount,
  onToggle,
  onExcludeAll,
  onIncludeAll,
  onClose,
}: {
  exercises: string[];
  excludedExercises: string[];
  cardCount: number;
  onToggle: (exercise: string) => void;
  onExcludeAll: () => void;
  onIncludeAll: () => void;
  onClose: () => void;
}) {
  const includedCount = exercises.length - excludedExercises.length;

  // When the exercise pool is empty (e.g. Core / Full Body decks that have no
  // exercise content yet), the "too few exercises" warning is meaningless —
  // there is nothing to include or exclude.
  const minRequired = cardCount <= 10 ? 4 : cardCount <= 20 ? 6 : 7;
  const tooFew = exercises.length > 0 && includedCount < minRequired;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col justify-end max-w-[430px] mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ background: "oklch(0.06 0.008 260 / 0.85)" }}
        onClick={onClose}
      />
      <motion.div
        className="relative flex flex-col rounded-t-3xl overflow-hidden"
        style={{
          background: "oklch(0.13 0.012 260)",
          border: "1.5px solid oklch(0.26 0.01 260 / 0.8)",
          borderBottom: "none",
          boxShadow: "0 -16px 60px oklch(0 0 0 / 0.5)",
          maxHeight: "85dvh",
        }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: "oklch(0.35 0.01 260)" }}
          />
        </div>
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid oklch(0.22 0.01 260 / 0.6)" }}
        >
          <div>
            <h2
              className="font-display font-black text-base tracking-widest uppercase"
              style={{ color: "oklch(0.95 0.01 260)" }}
            >
              Exclude Exercises
            </h2>
            <p
              className="text-xs font-body mt-0.5"
              style={{
                color:
                  includedCount < exercises.length
                    ? "oklch(0.68 0.25 180)"
                    : "oklch(0.55 0.008 260)",
              }}
              data-ocid="exclude-exercises.counter"
            >
              {includedCount} of {exercises.length} exercises included
            </p>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-smooth"
            style={{
              background: "oklch(0.20 0.01 260)",
              border: "1px solid oklch(0.28 0.01 260 / 0.6)",
              color: "oklch(0.65 0.008 260)",
            }}
            data-ocid="exclude-exercises.close_button"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Exclude All / Include All */}
        <div
          className="flex gap-3 px-5 pt-4 pb-3 shrink-0"
          style={{ borderBottom: "1px solid oklch(0.20 0.01 260 / 0.5)" }}
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onExcludeAll}
            className="flex-1 h-10 rounded-xl font-display font-black text-xs tracking-widest uppercase transition-smooth"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1.5px solid oklch(0.65 0.22 25 / 0.5)",
              color: "oklch(0.65 0.22 25)",
            }}
            data-ocid="exclude-exercises.exclude_all_button"
          >
            Exclude All
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onIncludeAll}
            className="flex-1 h-10 rounded-xl font-display font-black text-xs tracking-widest uppercase transition-smooth"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1.5px solid oklch(0.68 0.25 180 / 0.5)",
              color: "oklch(0.68 0.25 180)",
            }}
            data-ocid="exclude-exercises.include_all_button"
          >
            Include All
          </motion.button>
        </div>

        {/* Too-few warning */}
        {tooFew && (
          <div
            className="mx-5 mt-3 px-4 py-3 rounded-xl shrink-0"
            style={{
              background: "oklch(0.55 0.22 40 / 0.12)",
              border: "1px solid oklch(0.65 0.22 40 / 0.4)",
            }}
            data-ocid="exclude-exercises.warning"
          >
            <p
              className="text-xs font-body leading-snug"
              style={{ color: "oklch(0.78 0.18 40)" }}
            >
              Too few exercises selected for this session length. Include at
              least {minRequired} exercises or reduce the card count.
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {exercises.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 text-center"
              data-ocid="exclude-exercises.empty_state"
            >
              <p
                className="font-display font-black text-sm tracking-widest uppercase mb-2"
                style={{ color: "oklch(0.68 0.25 180)" }}
              >
                No exercises yet
              </p>
              <p
                className="text-xs font-body leading-relaxed max-w-[240px]"
                style={{ color: "oklch(0.55 0.008 260)" }}
              >
                This deck doesn&apos;t have exercise content yet. Exercises will
                appear here once the deck is populated.
              </p>
            </div>
          ) : (
            exercises.map((exercise, i) => {
              const isIncluded = !excludedExercises.includes(exercise);
              return (
                <motion.button
                  key={exercise}
                  type="button"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onToggle(exercise)}
                  className="w-full flex items-center gap-4 py-4 transition-smooth"
                  style={{
                    borderBottom:
                      i < exercises.length - 1
                        ? "1px solid oklch(0.20 0.01 260 / 0.6)"
                        : "none",
                  }}
                  data-ocid={`exclude-exercises.item.${i + 1}`}
                >
                  <div
                    className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center transition-smooth"
                    style={{
                      background: isIncluded
                        ? "oklch(0.68 0.25 180)"
                        : "oklch(0.18 0.01 260)",
                      border: isIncluded
                        ? "2px solid oklch(0.68 0.25 180)"
                        : "2px solid oklch(0.32 0.01 260 / 0.8)",
                      boxShadow: isIncluded
                        ? "0 0 12px oklch(0.68 0.25 180 / 0.3)"
                        : "none",
                    }}
                  >
                    {isIncluded ? (
                      <Check
                        className="w-3.5 h-3.5"
                        style={{ color: "oklch(0.1 0.008 260)" }}
                      />
                    ) : (
                      <X
                        className="w-3 h-3"
                        style={{ color: "oklch(0.45 0.008 260)" }}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      "font-display font-bold text-sm tracking-wide flex-1 text-left transition-smooth",
                    )}
                    style={{
                      color: isIncluded
                        ? "oklch(0.92 0.01 260)"
                        : "oklch(0.42 0.008 260)",
                      textDecoration: isIncluded ? "none" : "line-through",
                    }}
                  >
                    {exercise}
                  </span>
                  <span
                    className="text-[10px] font-display font-black tracking-widest px-2 py-0.5 rounded shrink-0"
                    style={{
                      background: isIncluded
                        ? "oklch(0.68 0.25 180 / 0.15)"
                        : "oklch(0.65 0.22 25 / 0.12)",
                      color: isIncluded
                        ? "oklch(0.68 0.25 180)"
                        : "oklch(0.65 0.22 25 / 0.7)",
                    }}
                  >
                    {isIncluded ? "IN" : "OUT"}
                  </span>
                </motion.button>
              );
            })
          )}
        </div>
        <div
          className="px-5 py-5 shrink-0"
          style={{ borderTop: "1px solid oklch(0.20 0.01 260 / 0.6)" }}
        >
          <Button
            className="w-full h-14 font-display font-black text-base tracking-widest rounded-2xl disabled:shadow-none disabled:opacity-50"
            style={{
              boxShadow: tooFew
                ? "none"
                : "0 0 32px oklch(0.68 0.25 180 / 0.3), 0 4px 16px oklch(0 0 0 / 0.3)",
            }}
            disabled={tooFew}
            onClick={onClose}
            data-ocid="exclude-exercises.done_button"
          >
            DONE
          </Button>
          {tooFew && (
            <p
              className="text-center text-xs font-body mt-2"
              style={{ color: "oklch(0.55 0.008 260)" }}
            >
              Resolve the warning above to continue
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Idle Shuffle Preview ---

function IdleShufflePreview({
  category,
  difficulty,
  gender,
}: {
  category: DeckCategory | null;
  difficulty: DeckDifficulty | null;
  gender: WorkoutGender;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const sampleCards = useMemo(() => {
    if (!category || !difficulty) return [];
    const config = getDeckExerciseConfig(category, difficulty, gender);
    if (!config) return [];

    const suitNames = Object.keys(config.suits);
    const rankMap: Record<number, Rank> = {
      2: Rank.Two,
      3: Rank.Three,
      4: Rank.Four,
      5: Rank.Five,
      6: Rank.Six,
      7: Rank.Seven,
      8: Rank.Eight,
      9: Rank.Nine,
      10: Rank.Ten,
      11: Rank.Jack,
      12: Rank.Queen,
    };

    const candidates: Card[] = [];
    for (const suitName of suitNames) {
      const suitCfg = config.suits[suitName];
      if (!suitCfg?.cardMap) continue;
      const suitEnum =
        suitName === "Hearts"
          ? Suit.Hearts
          : suitName === "Spades"
            ? Suit.Spades
            : suitName === "Clubs"
              ? Suit.Clubs
              : suitName === "Diamonds"
                ? Suit.Diamonds
                : Suit.Joker;
      for (const rankKey of Object.keys(suitCfg.cardMap)) {
        const entry = suitCfg.cardMap[Number(rankKey)];
        if (!entry?.exerciseName) continue;
        const rank = rankMap[Number(rankKey)] || Rank.Two;
        candidates.push({
          id: 0n,
          rank,
          suit: suitEnum,
          exercise: entry.exerciseName,
          deckId: 0n,
          // imageUrl intentionally left empty — PlayingCard resolves the
          // gender-correct illustration via resolveExerciseIllustration.
          imageUrl: "",
          repSpec: { __kind__: "Fixed", Fixed: BigInt(entry.reps || 10) },
          videoUrl: "",
        });
      }
      if (suitCfg.queen?.exerciseName) {
        candidates.push({
          id: 0n,
          rank: Rank.Queen,
          suit: suitEnum,
          exercise: suitCfg.queen.exerciseName,
          deckId: 0n,
          imageUrl: "",
          repSpec: {
            __kind__: "Fixed",
            Fixed: BigInt(suitCfg.queen.reps || 10),
          },
          videoUrl: "",
        });
      }
    }

    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    // Apply the same movement-category pass as the real workout deck so the
    // idle preview never shows two consecutive cards of the same category.
    const reordered = reorderNoConsecutiveCategories(shuffled, (c) =>
      getMovementCategory(c.exercise),
    );
    return reordered.slice(0, Math.min(5, Math.max(3, reordered.length)));
  }, [category, difficulty, gender]);

  useEffect(() => {
    if (isPaused || sampleCards.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sampleCards.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isPaused, sampleCards.length]);

  if (sampleCards.length === 0) {
    const defaultCard: Card = {
      id: 0n,
      rank: Rank.Two,
      suit: Suit.Spades,
      exercise: "Normal Push Up",
      deckId: 0n,
      imageUrl: resolveExerciseIllustration("Normal Push Up", gender),
      repSpec: { __kind__: "Fixed", Fixed: 12n },
      videoUrl: "",
    };
    return (
      <button
        type="button"
        onClick={() => setIsPaused((p) => !p)}
        aria-label={isPaused ? "Resume idle shuffle" : "Pause idle shuffle"}
        data-ocid="idle_shuffle.empty_state.button"
        style={{
          border: "1px solid oklch(0.26 0.01 260)",
          background:
            "radial-gradient(circle at 50% 30%, oklch(0.16 0.01 260), oklch(0.12 0.008 260))",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          padding: "8px",
          width: "100%",
          display: "block",
          cursor: "pointer",
          borderRadius: "16px",
          position: "relative",
        }}
      >
        <PlayingCard card={defaultCard} />
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            opacity: 0.3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "oklch(0.12 0.008 260 / 0.6)",
            transition: "opacity 200ms ease",
          }}
        >
          {isPaused ? (
            <Play size={12} color="oklch(0.68 0.25 180)" />
          ) : (
            <Pause size={12} color="oklch(0.68 0.25 180)" />
          )}
        </div>
      </button>
    );
  }

  const currentCard = sampleCards[currentIndex];

  return (
    <button
      type="button"
      onClick={() => setIsPaused((p) => !p)}
      aria-label={isPaused ? "Resume idle shuffle" : "Pause idle shuffle"}
      data-ocid="idle_shuffle.button"
      className="group relative block w-full cursor-pointer rounded-2xl p-2"
      style={{
        border: "1px solid oklch(0.26 0.01 260)",
        background:
          "radial-gradient(circle at 50% 30%, oklch(0.16 0.01 260), oklch(0.12 0.008 260))",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: -90, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformStyle: "preserve-3d", perspective: 1000 }}
        >
          <PlayingCard card={currentCard} />
        </motion.div>
      </AnimatePresence>
      <div
        data-ocid="idle_shuffle.pause_button"
        className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full opacity-30 transition-opacity duration-200 group-hover:opacity-60"
        style={{ background: "oklch(0.12 0.008 260 / 0.6)" }}
      >
        {isPaused ? (
          <Play size={12} color="oklch(0.68 0.25 180)" />
        ) : (
          <Pause size={12} color="oklch(0.68 0.25 180)" />
        )}
      </div>
    </button>
  );
}
