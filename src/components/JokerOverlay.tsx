import { JokerChallenge } from "@/backend";
import { Button } from "@/components/ui/button";
import { resolveExerciseIllustration } from "@/data/exerciseAssets";
import { useOnboarding } from "@/hooks/use-onboarding";
import type { WorkoutGender } from "@/hooks/use-workout";
import { JOKER_CHALLENGE_EMOJI, JOKER_CHALLENGE_LABEL } from "@/types/workout";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface JokerComboStep {
  reps: number;
  exerciseName: string;
  eachLeg?: boolean;
  imagePath?: string;
}

interface JokerOverlayProps {
  active: boolean;
  challenge: JokerChallenge | null;
  onDismiss: () => void;
  jokerComboList?: JokerComboStep[];
  /** Gender used to resolve per-exercise illustrations. If omitted, reads from
   * useOnboarding() (matching the ExerciseCard / WorkoutSetupPage pattern). */
  gender?: WorkoutGender;
}

function getChallengeSeconds(challenge: JokerChallenge | null): number {
  if (!challenge) return 30;
  if (challenge === JokerChallenge.DeadHang30) return 30;
  return 30;
}

export function JokerOverlay({
  active,
  challenge,
  onDismiss,
  jokerComboList,
  gender: genderProp,
}: JokerOverlayProps) {
  // Prefer the explicit gender prop; fall back to onboarding (ExerciseCard pattern).
  const onboardingGender = useOnboarding().gender;
  const gender: WorkoutGender = genderProp ?? onboardingGender;

  const isComboJoker = jokerComboList && jokerComboList.length > 0;
  const challengeKey: string = challenge ?? JokerChallenge.DeadHang30;
  // Always refer to the Joker as "Joker" — never "Combo Finisher".
  const challengeLabel = isComboJoker
    ? "Joker"
    : (JOKER_CHALLENGE_LABEL[challengeKey] ?? "Complete a challenge!");
  const challengeEmoji = isComboJoker
    ? "🃏"
    : (JOKER_CHALLENGE_EMOJI[challengeKey] ?? "🏋️");
  const totalSeconds = isComboJoker ? 0 : getChallengeSeconds(challenge);

  const [countdown, setCountdown] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [flash, setFlash] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active) {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
      setCountdown(totalSeconds);
      setRunning(false);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRunning(false);
    }
  }, [active, totalSeconds]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const pct = totalSeconds > 0 ? countdown / totalSeconds : 0;
  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference * (1 - pct);

  function handleStart() {
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    setRunning(true);
  }

  function handleDone() {
    setFlash(true);
    setTimeout(() => {
      setFlash(false);
      onDismiss();
    }, 150);
  }

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          // Scrollable overlay so the Continue button is always reachable,
          // even on small viewports with long combo lists.
          className="fixed inset-0 z-50 flex flex-col items-center justify-start overflow-y-auto py-8"
          style={{
            background:
              "radial-gradient(ellipse at 50% 30%, oklch(0.2 0.07 180) 0%, oklch(0.08 0.015 260) 100%)",
          }}
          data-ocid="joker-overlay"
        >
          {/* Flash feedback layer */}
          {flash && (
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{ background: "oklch(0.68 0.25 180 / 0.15)" }}
            />
          )}

          {/* Expanding pulse rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{ border: "1px solid oklch(0.68 0.25 180 / 0.3)" }}
                initial={{ width: 100, height: 100, opacity: 0.8 }}
                animate={{ width: 700, height: 700, opacity: 0 }}
                transition={{
                  duration: 2.8,
                  delay: i * 0.6,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>

          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 24,
              delay: 0.1,
            }}
            className="relative w-full max-w-sm px-6 text-center my-auto"
          >
            {/* Header */}
            <motion.div
              animate={{ rotate: [0, -6, 6, -3, 0] }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-7xl mb-3 leading-none"
            >
              🃏
            </motion.div>

            <h2
              className="font-display font-black text-6xl mb-1 tracking-tight"
              style={{
                color: "oklch(0.68 0.25 180)",
                textShadow:
                  "0 0 30px oklch(0.68 0.25 180 / 0.7), 0 0 60px oklch(0.68 0.25 180 / 0.3)",
              }}
            >
              JOKER!
            </h2>
            <p className="text-muted-foreground font-body text-xs mb-5 uppercase tracking-[0.25em]">
              Wild Challenge Drawn
            </p>

            {/* Challenge card */}
            <div
              className="rounded-2xl px-5 py-5 mb-5 backdrop-blur-md border"
              style={{
                background: "oklch(0.14 0.02 260 / 0.85)",
                borderColor: "oklch(0.68 0.25 180 / 0.35)",
                boxShadow:
                  "0 0 30px oklch(0.68 0.25 180 / 0.12), inset 0 0 40px oklch(0.68 0.25 180 / 0.04)",
              }}
            >
              <div className="text-4xl mb-2">{challengeEmoji}</div>
              <p className="font-display font-bold text-lg text-foreground mb-3 leading-snug">
                {challengeLabel}
              </p>

              {/* Combo Joker: per-exercise mini-illustration grid aligned 1:1
                  with the numbered list below. Each illustration is resolved
                  via resolveExerciseIllustration(step.exerciseName, gender) so
                  male/female mode shows the correct illustration set. */}
              {isComboJoker ? (
                <div className="w-full mb-3 text-left">
                  <div
                    className="mx-auto mb-3 rounded-xl p-2"
                    style={{
                      background: "oklch(0.16 0.015 260)",
                      border: "1px solid oklch(0.68 0.25 180 / 0.18)",
                    }}
                  >
                    <div
                      className="grid gap-2"
                      style={{
                        gridTemplateColumns:
                          jokerComboList!.length === 4 ? "1fr 1fr" : "1fr 1fr",
                      }}
                    >
                      {jokerComboList!.map((step, i) => (
                        <OverlayMiniIllustration
                          key={`${step.exerciseName}-${i}`}
                          step={step}
                          index={i}
                          gender={gender}
                        />
                      ))}
                    </div>
                  </div>
                  {jokerComboList!.map((step, i) => (
                    <div
                      key={`${step.exerciseName}-${i}`}
                      className="flex items-center gap-2 py-1.5"
                      style={{
                        borderBottom:
                          i < jokerComboList!.length - 1
                            ? "1px solid oklch(0.68 0.25 180 / 0.15)"
                            : "none",
                      }}
                    >
                      <span
                        className="font-display font-black text-base shrink-0 w-6 text-center"
                        style={{ color: "oklch(0.68 0.25 180)" }}
                      >
                        {i + 1}.
                      </span>
                      <span className="font-display font-bold text-sm text-foreground flex-1">
                        {step.reps}× {step.exerciseName}
                        {step.eachLeg && (
                          <span
                            className="text-[10px] font-body font-normal ml-1"
                            style={{ color: "oklch(0.68 0.25 180 / 0.7)" }}
                          >
                            (each leg)
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wider font-body">
                    No rest between exercises
                  </p>
                </div>
              ) : (
                /* Timer-based challenge */
                <div className="flex flex-col items-center mb-2">
                  <div className="relative w-28 h-28 mb-3">
                    <svg
                      className="w-full h-full -rotate-90"
                      viewBox="0 0 100 100"
                      role="img"
                      aria-label="Countdown timer"
                    >
                      <title>Countdown timer</title>
                      <circle
                        cx="50"
                        cy="50"
                        r="44"
                        fill="none"
                        stroke="oklch(0.26 0.01 260)"
                        strokeWidth="5"
                      />
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="44"
                        fill="none"
                        stroke="oklch(0.68 0.25 180)"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        animate={{ strokeDashoffset: dashOffset }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        style={{
                          filter:
                            "drop-shadow(0 0 8px oklch(0.68 0.25 180 / 0.9)) drop-shadow(0 0 16px oklch(0.68 0.25 180 / 0.4))",
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display font-black text-4xl text-foreground tabular-nums leading-none">
                        {countdown}
                      </span>
                      <span className="text-xs text-muted-foreground font-body mt-0.5">
                        sec
                      </span>
                    </div>
                  </div>

                  {!running && countdown === totalSeconds && (
                    <Button
                      type="button"
                      onClick={handleStart}
                      className="font-display font-bold tracking-widest text-sm px-6"
                      style={{
                        background: "oklch(0.68 0.25 180)",
                        color: "oklch(0.12 0.008 260)",
                        boxShadow: "0 0 20px oklch(0.68 0.25 180 / 0.4)",
                      }}
                      data-ocid="joker-overlay.start_timer_button"
                    >
                      START CHALLENGE
                    </Button>
                  )}
                  {running && (
                    <p
                      className="text-xs font-display font-bold uppercase tracking-[0.2em] pulse-accent"
                      style={{
                        color: "oklch(0.68 0.25 180)",
                        textShadow: "0 0 10px oklch(0.68 0.25 180 / 0.7)",
                      }}
                    >
                      Hold position!
                    </p>
                  )}
                  {!running && countdown === 0 && (
                    <p className="text-sm font-display font-bold uppercase tracking-wider text-primary">
                      ✓ Challenge complete!
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Continue / Done button — always reachable via overlay scroll */}
            <Button
              type="button"
              className="w-full font-display font-black text-base py-6 tracking-[0.15em] rounded-2xl"
              style={{
                background:
                  countdown === 0 || !running
                    ? "oklch(0.68 0.25 180)"
                    : "oklch(0.26 0.01 260)",
                color:
                  countdown === 0 || !running
                    ? "oklch(0.12 0.008 260)"
                    : "oklch(0.55 0.008 260)",
                boxShadow:
                  countdown === 0 || !running
                    ? "0 0 30px oklch(0.68 0.25 180 / 0.4)"
                    : "none",
              }}
              onClick={handleDone}
              data-ocid="joker-overlay.confirm_button"
            >
              {isComboJoker ? "CONTINUE" : "DONE — NEXT CARD"}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * One mini-illustration for a Joker combo step, aligned 1:1 with the numbered
 * list below. Resolves the illustration via resolveExerciseIllustration with
 * the threaded gender so male/female mode shows the correct set. Falls back to
 * the exercise name text if the image fails to load.
 */
function OverlayMiniIllustration({
  step,
  index,
  gender,
}: {
  step: JokerComboStep;
  index: number;
  gender: WorkoutGender;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const src = step.imagePath ?? resolveExerciseIllustration(step.exerciseName, gender);

  return (
    <div
      className="relative rounded-lg flex items-center justify-center"
      style={{
        background: "#fafafa",
        border: "1px solid oklch(0.68 0.25 180 / 0.18)",
        padding: "8px",
        aspectRatio: "1 / 1",
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <span
        className="absolute top-1 left-1.5 font-display font-black"
        style={{
          fontSize: "10px",
          color: "oklch(0.68 0.25 180)",
          zIndex: 2,
        }}
      >
        {index + 1}.
      </span>
      {imageFailed ? (
        <span
          className="text-center font-display font-bold uppercase leading-tight px-1"
          style={{
            fontSize: "10px",
            color: "oklch(0.20 0.01 260)",
            letterSpacing: "0.3px",
          }}
        >
          {step.exerciseName}
        </span>
      ) : (
        <img
          src={src}
          alt={step.exerciseName}
          loading="lazy"
          className="w-full h-full"
          style={{ objectFit: "contain" }}
          onError={() => setImageFailed(true)}
        />
      )}
    </div>
  );
}
