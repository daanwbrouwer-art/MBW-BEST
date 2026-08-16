import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  SUIT_CONFIG,
  type SuitKey,
  getSuitLabel,
  resolveExerciseIllustration,
} from "../data/exerciseAssets";
import { useOnboarding } from "../hooks/use-onboarding";
import type { WorkoutGender } from "../hooks/use-workout";

interface CardData {
  suit: string;
  rank: string;
  exercise: string;
  id?: string | bigint;
  videoUrl?: string;
  eachLeg?: boolean;
  eachSide?: boolean;
  holdSeconds?: number;
  specialInstruction?: string;
  imagePath?: string;
  jokerComboList?: Array<{
    reps: number;
    exerciseName: string;
    eachLeg?: boolean;
  }>;
  deckCategory?: string;
}

interface SessionCardLocal {
  card: CardData;
  reps: number | bigint;
  isMod?: boolean;
}

interface ExerciseCardProps {
  sessionCard: SessionCardLocal;
  previousCard?: SessionCardLocal | null;
  isRevealed?: boolean;
  onReveal?: () => void;
  className?: string;
  /** Gender used to resolve exercise illustrations. If omitted, reads from
   * useOnboarding() (matching the WorkoutSetupPage pattern). */
  gender?: WorkoutGender;
}

function toNum(v: number | bigint | undefined | null): number {
  if (v == null) return 0;
  return typeof v === "bigint" ? Number(v) : v;
}

/**
 * Returns an optional tempo cue (descent/pause timing) for exercises that
 * require a controlled tempo. Shown on screen below the rep count.
 */
function getTempoCue(exerciseName: string): string | null {
  const n = exerciseName.toLowerCase();
  if (n.includes("pike push-up slow") || n.includes("pike push up slow")) {
    return "3-sec descent";
  }
  if (n.includes("push-up negative") || n.includes("negative push")) {
    return "5-sec descent";
  }
  if (
    n.includes("bench dip slow negative") ||
    n.includes("negative bench dip")
  ) {
    return "5-sec descent";
  }
  return null;
}

/**
 * Returns an optional subtext note shown under the exercise name for cards
 * that share an illustration but need a distinguishing label or extra cue.
 */
function getExerciseSubtext(exerciseName: string): string | null {
  const n = exerciseName.toLowerCase();
  if (n.includes("superman hold")) return "2 sec hold per rep";
  if (n.includes("horizontal row")) return "Body parallel";
  if (n.includes("incline row")) return "Body at 45 deg";
  if (n.includes("elevated bench dip")) return "feet also elevated";
  if (n.includes("incline push")) return "hands on elevated surface";
  return null;
}

function getDisplayReps(
  sessionCard: SessionCardLocal,
  previousCard?: SessionCardLocal | null,
): number {
  const rank = sessionCard.card.rank;
  if (rank === "Ace") {
    const prev = toNum(previousCard?.reps);
    return prev > 0 ? prev * 2 : 2;
  }
  if (rank === "King") {
    const prev = toNum(previousCard?.reps);
    return Math.max(1, Math.ceil(prev > 0 ? prev / 2 : 1));
  }
  return toNum(sessionCard.reps);
}

function getDisplayExercise(
  sessionCard: SessionCardLocal,
  previousCard: SessionCardLocal | null | undefined,
  gender: WorkoutGender,
): { name: string; illustration: string } {
  const rank = sessionCard.card.rank;
  if ((rank === "Ace" || rank === "King") && previousCard) {
    const name = previousCard.card.exercise || "";
    // Prefer per-card imagePath if set on previous card
    const illustration = previousCard.card.imagePath
      ? previousCard.card.imagePath
      : resolveExerciseIllustration(name, gender);
    return { name, illustration };
  }
  const name = sessionCard.card.exercise || "";
  // Prefer per-card imagePath when set (Queen/hold cards need specific images)
  const illustration = sessionCard.card.imagePath
    ? sessionCard.card.imagePath
    : resolveExerciseIllustration(name, gender);
  return { name, illustration };
}

interface JokerComboStep {
  reps: number;
  exerciseName: string;
  eachLeg?: boolean;
}

/**
 * Renders one mini-illustration per Joker combo step, aligned 1:1 with the
 * numbered exercise list below it. Each illustration is resolved via
 * resolveExerciseIllustration(step.exerciseName, gender) so male/female mode
 * shows the correct illustration set. Falls back to the exercise name text if
 * an image fails to load.
 */
function JokerMiniGrid({
  steps,
  gender,
  accent,
}: {
  steps: JokerComboStep[];
  gender: WorkoutGender;
  accent: string;
}) {
  // 2x2 grid for the common 4-exercise case; responsive flex-wrap otherwise.
  const gridStyle: React.CSSProperties =
    steps.length === 4
      ? {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: "6px",
          width: "100%",
          height: "100%",
        }
      : {
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          width: "100%",
          height: "100%",
          alignContent: "center",
          justifyContent: "center",
        };

  const cellFlex =
    steps.length === 4 ? undefined : steps.length <= 2 ? "1 1 100%" : "1 1 45%";

  return (
    <div style={gridStyle}>
      {steps.map((step, i) => (
        <MiniIllustration
          key={`${step.exerciseName}-${i}`}
          step={step}
          index={i}
          gender={gender}
          accent={accent}
          flexBasis={cellFlex}
        />
      ))}
    </div>
  );
}

function MiniIllustration({
  step,
  index,
  gender,
  accent,
  flexBasis,
}: {
  step: JokerComboStep;
  index: number;
  gender: WorkoutGender;
  accent: string;
  flexBasis?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const src = resolveExerciseIllustration(step.exerciseName, gender);

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "8px",
        overflow: "hidden",
        background: "#fafafa",
        border: `1px solid ${accent.replace(")", " / 0.18)").replace("oklch(", "oklch(")}`,
        padding: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 0,
        minWidth: 0,
        flex: flexBasis,
        aspectRatio: flexBasis ? undefined : "1 / 1",
      }}
    >
      {/* Numbered badge aligned to the list item index */}
      <span
        style={{
          position: "absolute",
          top: "2px",
          left: "4px",
          fontSize: "8px",
          fontWeight: "900",
          color: accent,
          letterSpacing: "0.5px",
          zIndex: 2,
        }}
      >
        {index + 1}.
      </span>
      {imageFailed ? (
        <span
          style={{
            fontSize: "8px",
            fontWeight: "700",
            color: "oklch(0.20 0.01 260)",
            textAlign: "center",
            lineHeight: 1.2,
            padding: "2px",
            textTransform: "uppercase",
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
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
          onError={() => setImageFailed(true)}
        />
      )}
    </div>
  );
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  sessionCard,
  previousCard,
  isRevealed = true,
  onReveal,
  className = "",
  gender: genderProp,
}) => {
  // Prefer the explicit gender prop; fall back to onboarding (WorkoutSetupPage pattern).
  const onboardingGender = useOnboarding().gender;
  const gender: WorkoutGender = genderProp ?? onboardingGender;

  const [showFront, setShowFront] = useState(isRevealed);
  const [flipPhase, setFlipPhase] = useState<
    "idle" | "windup" | "flipping" | "landed"
  >(isRevealed ? "landed" : "idle");
  // Hand-authored per-card imagePath values occasionally 404 (typos, files
  // never uploaded). Falls back to the keyword-based resolver instead of
  // showing a broken image icon. Resets naturally since this whole
  // component remounts per card (keyed by card id in WorkoutSessionPage).
  const [illustrationFailed, setIllustrationFailed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  const rank = sessionCard.card.rank || "";
  const isAce = rank === "Ace";
  const isKing = rank === "King";
  const isJoker = rank === "Joker" || sessionCard.card.suit === "Joker";
  const isSpecial = isAce || isKing || isJoker;

  useEffect(() => {
    if (isRevealed && !showFront) {
      // Phase 1: Wind-up (80ms)
      setFlipPhase("windup");
      const windupTimer = setTimeout(() => {
        // Phase 2: Flip
        setFlipPhase("flipping");
        const flipDuration = isSpecial ? 800 : 500;
        const landTimer = setTimeout(() => {
          setShowFront(true);
          setFlipPhase("landed");
        }, flipDuration);
        return () => clearTimeout(landTimer);
      }, 80);
      return () => clearTimeout(windupTimer);
    }
  }, [isRevealed, showFront, isSpecial]);

  const suit = sessionCard.card.suit as SuitKey;

  const _suitLabel = getSuitLabel(suit, sessionCard.card.deckCategory);

  const suitCfg = isJoker
    ? SUIT_CONFIG.Joker
    : (SUIT_CONFIG[suit] ?? SUIT_CONFIG.Hearts);

  const reps = getDisplayReps(sessionCard, previousCard);
  const exercise = getDisplayExercise(sessionCard, previousCard, gender);
  const displayValue = isAce ? "A" : isKing ? "K" : isJoker ? "\u2605" : rank;

  // Build animation classes based on flip phase and card type
  const getFlipAnimationClass = () => {
    if (flipPhase === "windup") return "card-flip-windup";
    if (flipPhase === "flipping") {
      return isSpecial ? "card-flip-special-anim" : "card-flip-standard-anim";
    }
    if (flipPhase === "landed") {
      if (isAce) return "ace-glow-burst-anim";
      if (isKing) return "king-glow-burst-anim";
      if (isJoker) return "joker-glow-burst-anim";
      return "card-land-glow-anim";
    }
    return "";
  };

  const cardWrapper: React.CSSProperties = {
    width: "100%",
    maxWidth: "320px",
    aspectRatio: "2.5/3.5",
    borderRadius: "16px",
    overflow: "hidden",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    userSelect: "none",
    transformStyle: "preserve-3d",
    willChange: flipPhase !== "idle" ? "transform" : "auto",
  };

  if (!showFront) {
    return (
      <button
        type="button"
        ref={buttonRef}
        className={`${className} ${getFlipAnimationClass()}`}
        style={{
          ...cardWrapper,
          cursor: "pointer",
          background: "oklch(0.10 0.015 260)",
          border: "none",
          padding: 0,
        }}
        onClick={onReveal}
        data-ocid="exercise-card"
      >
        <img
          src="/assets/exercises/backside_of_card.png"
          alt="Card back"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "16px",
          }}
          onError={(e) => {
            const el = e.currentTarget;
            el.style.display = "none";
            const p = el.parentElement;
            if (p)
              p.style.background =
                "linear-gradient(160deg, oklch(0.10 0.015 260) 0%, oklch(0.14 0.02 260) 100%)";
          }}
        />
      </button>
    );
  }

  if (isJoker) {
    const exerciseName = sessionCard.card.exercise || "";
    const jokerComboList = sessionCard.card.jokerComboList ?? [];
    const isComboJoker = jokerComboList.length > 0;
    const jokerAccent = "oklch(0.68 0.25 180)";

    return (
      <div
        ref={divRef}
        className={`${className} ${getFlipAnimationClass()}`}
        style={{
          ...cardWrapper,
          background:
            "linear-gradient(160deg, oklch(0.08 0.02 260) 0%, oklch(0.10 0.025 255) 50%, oklch(0.08 0.025 255) 100%)",
          border: `1.5px solid ${jokerAccent.replace(")", " / 0.5)").replace("oklch(", "oklch(")}`,
          boxShadow:
            "0 0 40px oklch(0.68 0.25 180 / 0.4), 0 0 80px oklch(0.68 0.25 180 / 0.15), 0 8px 32px oklch(0 0 0 / 0.8)",
        }}
        data-ocid="exercise-card"
      >
        {/* Joker expanding ring */}
        {flipPhase === "landed" && (
          <div
            className="joker-ring-anim"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              zIndex: 20,
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                border: `2px solid ${jokerAccent}`,
              }}
            />
          </div>
        )}
        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "26px",
              fontWeight: "900",
              color: jokerAccent,
              textShadow: "0 0 12px oklch(0.68 0.25 180 / 0.9)",
            }}
          >
            {"\u2605"}
          </span>
          <span
            style={{
              fontSize: "9px",
              letterSpacing: "3px",
              color: jokerAccent,
              fontWeight: "700",
              textTransform: "uppercase",
            }}
          >
            WILD CARD
          </span>
          <span
            style={{
              fontSize: "26px",
              fontWeight: "900",
              color: jokerAccent,
              textShadow: "0 0 12px oklch(0.68 0.25 180 / 0.9)",
            }}
          >
            {"★"}
          </span>
        </div>
        <div style={{ textAlign: "center", marginBottom: "6px" }}>
          <span
            style={{
              fontSize: "28px",
              fontWeight: "900",
              letterSpacing: "6px",
              color: jokerAccent,
              textShadow: "0 0 20px oklch(0.68 0.25 180 / 0.9)",
            }}
          >
            JOKER
          </span>
        </div>
        <div
          style={{
            margin: "0 16px",
            borderRadius: "10px",
            overflow: "hidden",
            background: "oklch(0.68 0.25 180 / 0.04)",
            border: "1px solid oklch(0.68 0.25 180 / 0.2)",
            flex: 1,
            minHeight: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isComboJoker ? "8px" : 0,
          }}
        >
          {isComboJoker ? (
            <JokerMiniGrid
              steps={jokerComboList}
              gender={gender}
              accent={jokerAccent}
            />
          ) : (
            <img
              src={
                illustrationFailed
                  ? resolveExerciseIllustration(exerciseName || "plank", gender)
                  : (sessionCard.card.imagePath ??
                    resolveExerciseIllustration(
                      exerciseName || "plank",
                      gender,
                    ))
              }
              onError={() => {
                if (!illustrationFailed) setIllustrationFailed(true);
              }}
              alt="Challenge"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                padding: "8px",
              }}
            />
          )}
        </div>
        <div
          style={{
            background: "oklch(0.08 0.005 260)",
            padding: "10px 14px",
            textAlign: "center",
          }}
        >
          {isComboJoker ? (
            <>
              <div
                style={{
                  fontSize: "9px",
                  color: "oklch(0.68 0.25 180 / 0.6)",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                JOKER
              </div>
              {jokerComboList.map((step, i) => (
                <div
                  key={`${step.exerciseName}-${i}`}
                  style={{
                    fontSize: "9px",
                    fontWeight: "700",
                    color: jokerAccent,
                    letterSpacing: "0.5px",
                    lineHeight: 1.5,
                  }}
                >
                  {i + 1}. {step.reps}× {step.exerciseName}
                  {step.eachLeg ? " (each leg)" : ""}
                </div>
              ))}
            </>
          ) : (
            <div
              style={{
                fontSize: "9px",
                color: "oklch(0.68 0.25 180 / 0.6)",
                letterSpacing: "2px",
                textTransform: "uppercase",
              }}
            >
              CHALLENGE
            </div>
          )}
        </div>
      </div>
    );
  }

  const accentColor = isAce
    ? "oklch(0.76 0.22 60)"
    : isKing
      ? "oklch(0.78 0.04 240)"
      : suitCfg.accent;
  const glowColor = isAce
    ? "oklch(0.76 0.22 60 / 0.4)"
    : isKing
      ? "oklch(0.78 0.04 240 / 0.3)"
      : suitCfg.glowColor;

  return (
    <div
      ref={divRef}
      className={`${className} ${getFlipAnimationClass()}`}
      style={{
        ...cardWrapper,
        background: `linear-gradient(160deg, ${suitCfg.gradientFrom} 0%, ${suitCfg.gradientTo} 100%)`,
        border: `1.5px solid ${accentColor.replace(")", " / 0.27)").replace("oklch(", "oklch(")}`,
        boxShadow: `0 0 24px ${glowColor}, 0 8px 32px oklch(0 0 0 / 0.7), inset 0 1px 0 oklch(1 0 0 / 0.04)`,
      }}
      data-ocid="exercise-card"
    >
      {/* Shimmer sweep overlay on reveal */}
      {flipPhase === "landed" && <div className="card-shimmer-overlay" />}
      {isAce && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center 30%, oklch(0.76 0.22 60 / 0.12) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}
      {isKing && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center 30%, oklch(0.78 0.04 240 / 0.08) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}

      {/* Corner rank + suit */}
      <div
        style={{
          padding: "10px 12px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div>
          <div
            style={{
              fontSize: isSpecial ? "28px" : "22px",
              fontWeight: "900",
              color: accentColor,
              textShadow: `0 0 10px ${glowColor}`,
              lineHeight: 1,
            }}
          >
            {displayValue}
          </div>
          <div
            style={{
              fontSize: "16px",
              color: accentColor,
              lineHeight: 1,
              marginTop: "1px",
            }}
          >
            {suitCfg.symbol}
          </div>
        </div>
        <img
          src="/assets/images/mbw-logo-white-icon.png"
          alt="MBW"
          style={{
            width: "24px",
            height: "24px",
            objectFit: "contain",
            opacity: 0.6,
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>

      {/* Exercise illustration — beige/cream card body per original design */}
      <div
        style={{
          flex: 1,
          margin: "6px 12px",
          borderRadius: "8px",
          overflow: "hidden",
          background:
            "radial-gradient(ellipse at 50% 40%, oklch(0.99 0.005 70) 0%, oklch(0.97 0.008 70) 60%, oklch(0.95 0.012 70) 100%)",
          border: `1px solid ${accentColor.replace(")", " / 0.13)").replace("oklch(", "oklch(")}`,
          boxShadow:
            "inset 0 2px 8px oklch(0 0 0 / 0.08), inset 0 0 0 1px oklch(1 0 0 / 0.6)",
          position: "relative",
          zIndex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "14px",
        }}
      >
        <img
          src={
            illustrationFailed
              ? resolveExerciseIllustration(exercise.name, gender)
              : exercise.illustration
          }
          alt={exercise.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
          onError={() => {
            if (!illustrationFailed) setIllustrationFailed(true);
          }}
        />
      </div>

      {/* Bottom strip — original black strip design with white typography */}
      <div
        style={{
          background: "var(--card-black, oklch(0.08 0.005 260))",
          padding: "8px 12px 10px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {isAce && (
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "2px",
              color: "oklch(0.76 0.22 60)",
              fontWeight: "700",
              background: "oklch(0.76 0.22 60 / 0.12)",
              border: "1px solid oklch(0.76 0.22 60 / 0.3)",
              borderRadius: "3px",
              display: "inline-block",
              padding: "2px 6px",
              marginBottom: "3px",
            }}
          >
            ACE — DOUBLE REPS
          </div>
        )}
        {isKing && (
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "2px",
              color: "oklch(0.78 0.04 240)",
              fontWeight: "700",
              background: "oklch(0.78 0.04 240 / 0.08)",
              border: "1px solid oklch(0.78 0.04 240 / 0.25)",
              borderRadius: "3px",
              display: "inline-block",
              padding: "2px 6px",
              marginBottom: "3px",
            }}
          >
            KING — HALF REPS
          </div>
        )}
        {/* Reps or isometric hold seconds — the full cue text lives in the
            Exercise Info panel now, not duplicated here on the card face. */}
        {sessionCard.card.holdSeconds ? (
          /* Isometric hold — show countdown seconds instead of reps */
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
            <span
              style={{
                fontSize: "42px",
                fontWeight: "900",
                color: "oklch(0.68 0.25 180)",
                lineHeight: 1,
                textShadow: "0 2px 8px oklch(0 0 0 / 0.5)",
                letterSpacing: "-1px",
                fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
              }}
            >
              {sessionCard.card.holdSeconds}
            </span>
            <span
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "oklch(0.68 0.25 180 / 0.8)",
                fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
              }}
            >
              sec
            </span>
          </div>
        ) : (
          /* Normal rep count */
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            {(isAce || isKing) && (
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: isAce
                    ? "oklch(0.76 0.22 60 / 0.8)"
                    : "oklch(0.78 0.04 240 / 0.8)",
                }}
              >
                {isAce ? "\u00d72" : "\u00f72"}
              </span>
            )}
            <span
              style={{
                fontSize: "42px",
                fontWeight: "900",
                color: "oklch(0.97 0.005 260)",
                lineHeight: 1,
                textShadow: "0 2px 8px oklch(0 0 0 / 0.5)",
                letterSpacing: "-1px",
                fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
              }}
            >
              {reps}
            </span>
          </div>
        )}
        <div
          style={{
            fontSize: "11px",
            fontWeight: "700",
            color: "oklch(0.92 0.01 260)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            lineHeight: 1.2,
            marginTop: "1px",
            fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
          }}
        >
          {exercise.name}
        </div>
        {/* Tempo cue for slow/negative exercises */}
        {(() => {
          const tempo = getTempoCue(exercise.name);
          if (!tempo) return null;
          return (
            <div
              style={{
                fontSize: "9px",
                fontWeight: "700",
                color: "oklch(0.76 0.22 60)",
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginTop: "2px",
                background: "oklch(0.76 0.22 60 / 0.12)",
                border: "1px solid oklch(0.76 0.22 60 / 0.3)",
                borderRadius: "3px",
                display: "inline-block",
                padding: "1px 5px",
              }}
            >
              {tempo}
            </div>
          );
        })()}
        {/* Subtext note (shared illustrations / extra cues) */}
        {(() => {
          const sub = getExerciseSubtext(exercise.name);
          if (!sub) return null;
          return (
            <div
              style={{
                fontSize: "9px",
                fontWeight: "600",
                color: "oklch(0.68 0.25 180 / 0.85)",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                marginTop: "2px",
              }}
            >
              {sub}
            </div>
          );
        })()}
        {/* Each leg / each side label */}
        {(sessionCard.card.eachLeg || sessionCard.card.eachSide) && (
          <div
            style={{
              fontSize: "9px",
              fontWeight: "600",
              color: "oklch(0.68 0.25 180 / 0.8)",
              letterSpacing: "1px",
              textTransform: "uppercase",
              marginTop: "1px",
            }}
          >
            {sessionCard.card.eachSide ? "each side" : "each leg"}
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "3px",
            marginTop: "3px",
          }}
        >
          <span style={{ fontSize: "11px", color: suitCfg.accent }}>
            {suitCfg.symbol}
          </span>
        </div>
      </div>

      {/* Bottom-right rotated corner rank — pinned above the strip */}
      <div
        style={{
          position: "absolute",
          bottom: "64px",
          right: "12px",
          textAlign: "right",
          transform: "rotate(180deg)",
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontSize: "16px",
            fontWeight: "900",
            color: accentColor,
            opacity: 0.5,
            lineHeight: 1,
          }}
        >
          {displayValue}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: accentColor,
            opacity: 0.5,
            lineHeight: 1,
            marginTop: "1px",
          }}
        >
          {suitCfg.symbol}
        </div>
      </div>
    </div>
  );
};

export default ExerciseCard;
