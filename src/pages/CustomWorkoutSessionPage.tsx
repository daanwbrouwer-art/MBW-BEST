import { Logo } from "@/components/Logo";
import { ProgressBar } from "@/components/ProgressBar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { resolveExerciseIllustration } from "@/data/exerciseAssets";
import { useOnboarding } from "@/hooks/use-onboarding";
import { buildCustomWorkoutSteps } from "@/lib/customWorkoutBuilder";
import { useCustomWorkoutStore } from "@/store/customWorkout";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Trophy, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

export default function CustomWorkoutSessionPage() {
  const navigate = useNavigate();
  const { deckId } = useParams({ strict: false }) as { deckId?: string };
  const { gender } = useOnboarding();
  const { getDeck } = useCustomWorkoutStore();

  // Deck lookup + step build both computed once per session (lazy
  // initializer) so the Double/Half modifier placement stays stable across
  // re-renders instead of reshuffling every time the component renders.
  const [deckName] = useState(() =>
    deckId ? getDeck(deckId)?.name : undefined,
  );
  const [steps] = useState(() =>
    buildCustomWorkoutSteps(deckId ? (getDeck(deckId)?.exercises ?? []) : []),
  );

  const [index, setIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [holdCountdown, setHoldCountdown] = useState(0);
  const [holdComplete, setHoldComplete] = useState(false);

  const total = steps.length;
  const current = steps[index];

  // Bounce back to the deck list if there's nothing to train — no deckId,
  // the deck was deleted, or it's genuinely empty.
  useEffect(() => {
    if (total === 0 && !isDone) {
      navigate({ to: "/custom-workout" });
    }
  }, [total, isDone, navigate]);

  // Live countdown for isometric exercises (and isometric modifier cards,
  // which inherit isIsometric from the exercise they modify) — same
  // tick-every-second / vibrate-on-complete pattern used for hold exercises
  // in the main card-deck session.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on step identity
  useEffect(() => {
    if (!current || !current.isIsometric) {
      setHoldCountdown(0);
      setHoldComplete(false);
      return;
    }
    setHoldCountdown(current.value);
    setHoldComplete(false);

    const interval = setInterval(() => {
      setHoldCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setHoldComplete(true);
          if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [index, current?.key]);

  const handleNext = () => {
    if (navigator.vibrate) navigator.vibrate(50);
    if (index >= total - 1) {
      setIsDone(true);
      return;
    }
    setIndex((i) => i + 1);
  };

  const handleBack = () => {
    if (index === 0) return;
    setIndex((i) => i - 1);
  };

  const handleFinish = () => {
    navigate({ to: "/home" });
  };

  if (isDone) {
    return (
      <div className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto items-center justify-center px-8 text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{
            background: "oklch(0.68 0.25 180 / 0.15)",
            border: "2px solid oklch(0.68 0.25 180 / 0.4)",
          }}
        >
          <Trophy
            className="w-9 h-9"
            style={{ color: "oklch(0.68 0.25 180)" }}
          />
        </motion.div>
        <h1 className="font-display font-black text-2xl text-foreground mb-2">
          Workout Complete!
        </h1>
        <p className="text-sm text-muted-foreground font-body mb-8">
          You crushed all {total} exercises
          {deckName ? ` in "${deckName}"` : " in your custom workout"}.
        </p>
        <Button
          className="w-full h-14 font-display font-black text-base tracking-[0.1em] rounded-2xl uppercase"
          onClick={handleFinish}
          data-ocid="custom-workout.finish_button"
        >
          Back to Home
        </Button>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto relative">
      <div
        className="pointer-events-none fixed inset-0 max-w-[430px] mx-auto"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.22 0.04 180 / 0.2) 0%, transparent 65%)",
        }}
      />

      <header className="relative flex items-center gap-3 px-5 pt-12 pb-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="w-10 h-10 rounded-xl bg-card border border-border/60 flex items-center justify-center text-muted-foreground hover:text-destructive transition-smooth shrink-0"
              data-ocid="custom-workout.quit_button"
            >
              <X className="w-4 h-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Quit this workout?</AlertDialogTitle>
              <AlertDialogDescription>
                Your progress on this custom workout won't be saved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep going</AlertDialogCancel>
              <AlertDialogAction onClick={() => navigate({ to: "/home" })}>
                Quit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Logo size="sm" iconOnly className="opacity-70" />
      </header>

      <div className="relative px-5 pb-4">
        <ProgressBar current={index + 1} total={total} label="YOUR WORKOUT" />
      </div>

      <div className="relative flex-1 px-5 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.key}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col"
          >
            <div
              className="relative w-full rounded-3xl overflow-hidden mb-4"
              style={{
                aspectRatio: "1 / 1",
                background: "oklch(0.16 0.01 260)",
                border: current.modifier
                  ? `1.5px solid ${current.modifier === "double" ? "oklch(0.76 0.22 60 / 0.4)" : "oklch(0.78 0.04 240 / 0.35)"}`
                  : "1px solid oklch(0.68 0.25 180 / 0.2)",
                boxShadow: current.modifier
                  ? `0 0 24px ${current.modifier === "double" ? "oklch(0.76 0.22 60 / 0.25)" : "oklch(0.78 0.04 240 / 0.2)"}`
                  : undefined,
              }}
            >
              <img
                src={resolveExerciseIllustration(current.name, gender)}
                alt={current.name}
                className="w-full h-full object-cover"
              />
              {current.modifier && (
                <div
                  className="absolute top-3 left-3 flex items-center gap-1 text-[10px] font-display font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full"
                  style={{
                    background:
                      current.modifier === "double"
                        ? "oklch(0.76 0.22 60 / 0.9)"
                        : "oklch(0.78 0.04 240 / 0.85)",
                    color: "oklch(0.08 0.005 260)",
                  }}
                  data-ocid="custom-workout.modifier_banner"
                >
                  {current.modifier === "double"
                    ? "\u00d72 DOUBLE"
                    : "\u00f72 HALF"}
                </div>
              )}
            </div>

            <div className="flex items-end justify-between mb-2">
              <div className="min-w-0 flex-1 mr-4">
                <p className="text-xs font-body text-white/60 uppercase tracking-widest mb-1">
                  STEP {index + 1} OF {total}
                </p>
                <h2 className="font-display font-bold text-2xl text-foreground uppercase tracking-wide leading-tight">
                  {current.name}
                  {current.eachSide && (
                    <span className="text-sm text-muted-foreground normal-case tracking-normal font-body">
                      {" "}
                      (each side)
                    </span>
                  )}
                </h2>
                {current.modifier && (
                  <p
                    className="text-xs font-display font-bold uppercase tracking-widest mt-1"
                    style={{
                      color:
                        current.modifier === "double"
                          ? "oklch(0.76 0.22 60)"
                          : "oklch(0.78 0.04 240)",
                    }}
                  >
                    {current.modifier === "double"
                      ? "Double the previous exercise"
                      : "Half the previous exercise"}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                {current.isIsometric ? (
                  holdComplete ? (
                    <div className="font-display font-black text-2xl text-primary leading-none tabular-nums text-shadow-glow">
                      Hold complete!
                    </div>
                  ) : (
                    <>
                      <div className="font-display font-black text-5xl text-primary leading-none text-shadow-glow tabular-nums">
                        {holdCountdown}
                      </div>
                      <div className="text-xs font-body text-white/60 uppercase tracking-widest mt-1">
                        SECONDS
                      </div>
                    </>
                  )
                ) : (
                  <>
                    <div className="font-display font-black text-5xl text-primary leading-none text-shadow-glow tabular-nums">
                      {current.value}
                    </div>
                    <div className="text-xs font-body text-white/60 uppercase tracking-widest mt-1">
                      REPS
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-5 pt-1 pb-6 flex flex-col gap-2">
        <motion.div whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.01 }}>
          <Button
            className="w-full h-14 font-display font-black text-xl tracking-[0.15em] rounded-2xl uppercase shadow-[0_0_40px_oklch(0.68_0.25_180/0.35)]"
            onClick={handleNext}
            data-ocid="custom-workout.next_button"
          >
            {index >= total - 1 ? (
              <span className="flex items-center gap-2">
                FINISH WORKOUT
                <ChevronRight className="w-5 h-5" />
              </span>
            ) : (
              <span className="flex items-center gap-2">
                NEXT EXERCISE
                <ChevronRight className="w-5 h-5" />
              </span>
            )}
          </Button>
        </motion.div>

        <motion.div whileTap={{ scale: 0.96 }}>
          <Button
            type="button"
            variant="ghost"
            className="w-full h-10 rounded-xl font-display font-bold text-sm tracking-[0.1em] uppercase border border-border/30 bg-card/40 disabled:opacity-30"
            onClick={handleBack}
            disabled={index === 0}
            data-ocid="custom-workout.back_button"
          >
            <ChevronLeft className="w-4 h-4" />
            BACK
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
