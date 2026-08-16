import {
  SUIT_CONFIG,
  type SuitKey,
  resolveExerciseIllustration,
} from "@/data/exerciseAssets";
import { useOnboarding } from "@/hooks/use-onboarding";
import type { WorkoutGender } from "@/hooks/use-workout";
import { cn } from "@/lib/utils";
import { type Card, RANK_LABEL } from "@/types/workout";
import { useState } from "react";

interface PlayingCardProps {
  card?: Card | null;
  isFlipping?: boolean;
  showBack?: boolean;
  className?: string;
  compact?: boolean;
  /** Gender used to resolve exercise illustrations. If omitted, reads from
   * useOnboarding() (matching the WorkoutSetupPage pattern). */
  gender?: WorkoutGender;
}

// Near-black card body (#111111) with subtle teal border at ~18% opacity.
const CARD_BODY_BG = "oklch(0.13 0.005 260)"; // ~#111111
const TEAL_BORDER = "oklch(0.68 0.25 180 / 0.18)"; // #2dd4a0 @ 18%
const CREAM_BG = "oklch(0.98 0.005 70)"; // ~#fafafa
const TEAL_REP = "oklch(0.68 0.25 180)"; // #2dd4a0

/**
 * PlayingCard renders a single workout card.
 *
 * FRONT FACE (redesigned):
 *  - Near-black body (#0d0d0d) with 1px teal border @ 20% opacity, 14px radius.
 *  - Top-left corner: suit symbol + card value stacked (real playing-card style).
 *  - Bottom-right corner: same suit symbol + value rotated 180°.
 *  - Center: exercise illustration in a cream (#fafafa) rounded container with
 *    object-fit: contain and 14px internal padding.
 *  - Below illustration: exercise name in bold all-caps white.
 *  - Below name: rep count in teal as "x N REPS".
 *  - Image onerror swaps to a clean text fallback (exercise name, large bold).
 *
 * BACK FACE: premium MBW branded dark card back (unchanged).
 */
export function PlayingCard({
  card,
  isFlipping = false,
  showBack = false,
  className,
  compact = false,
  gender: genderProp,
}: PlayingCardProps) {
  // Prefer the explicit gender prop; fall back to onboarding (WorkoutSetupPage pattern).
  const onboardingGender = useOnboarding().gender;
  const gender: WorkoutGender = genderProp ?? onboardingGender;

  const size = compact ? "w-full h-full" : "w-48 h-64";
  const [imageFailed, setImageFailed] = useState(false);

  // Resolve exercise metadata for the front face.
  const suit = (card?.suit as SuitKey | undefined) ?? "Hearts";
  const suitCfg = SUIT_CONFIG[suit] ?? SUIT_CONFIG.Hearts;
  const exerciseName = card?.exercise ?? "";
  // Resolver is the primary path so gender-correct illustrations are always
  // used. Only fall back to card.imageUrl if the resolver returns nothing.
  const resolvedIllustration = resolveExerciseIllustration(
    exerciseName,
    gender,
  );
  const illustration = resolvedIllustration || card?.imageUrl || "";

  // Card value label (2-10, J, Q, K, A, JOKER).
  const rankKey = card?.rank ?? "";
  const valueLabel = RANK_LABEL[rankKey] ?? "";
  const isJoker = suit === "Joker" || rankKey === "Joker";

  // Rep count: Card.repSpec is a variant; Fixed carries the bigint count.
  function getRepCount(): string {
    if (!card?.repSpec) return "";
    const spec = card.repSpec;
    if (spec.__kind__ === "Fixed" && spec.Fixed != null) {
      return String(spec.Fixed);
    }
    if (spec.__kind__ === "Double") return "2";
    if (spec.__kind__ === "Half") return "½";
    if (spec.__kind__ === "JokerChallenge") return "CHALLENGE";
    return "";
  }

  const repCount = getRepCount();
  const repDisplay = isJoker
    ? "JOKER"
    : repCount === "½"
      ? "x ½ REPS"
      : repCount === "CHALLENGE"
        ? "CHALLENGE"
        : repCount
          ? `x ${repCount} REPS`
          : "";

  // Suit color: red for hearts/diamonds, white for spades/clubs, teal for joker.
  const suitColor =
    suit === "Hearts" || suit === "Diamonds"
      ? "oklch(0.65 0.22 25)" // red
      : suit === "Joker"
        ? TEAL_REP
        : "oklch(0.97 0.005 260)"; // white for spades/clubs

  // Corner block: suit symbol stacked over the card value.
  const CornerBlock = ({ rotated = false }: { rotated?: boolean }) => (
    <div
      className={cn(
        "flex flex-col items-center leading-none",
        rotated && "rotate-180",
        compact ? "text-[10px]" : "text-sm",
      )}
      style={{ color: suitColor }}
    >
      <span
        className={cn(
          "font-display font-black",
          compact ? "text-xs" : "text-base",
        )}
        style={{ lineHeight: 1 }}
      >
        {suitCfg.symbol}
      </span>
      <span
        className={cn(
          "font-display font-black mt-0.5",
          compact ? "text-[10px]" : "text-xs",
        )}
        style={{ lineHeight: 1 }}
      >
        {valueLabel}
      </span>
    </div>
  );

  return (
    <div className={cn("card-flip", className)}>
      <div
        className={cn(
          "card-flip-inner relative",
          size,
          (isFlipping || showBack) && "flipped",
        )}
      >
        {/* Front face — real-playing-card layout (default visible) */}
        <div
          className="card-face absolute inset-0 overflow-hidden flex flex-col"
          style={{
            background: CARD_BODY_BG,
            border: `1px solid ${TEAL_BORDER}`,
            borderRadius: "14px",
            boxShadow:
              "0 0 24px oklch(0.68 0.25 180 / 0.18), 0 8px 32px oklch(0 0 0 / 0.6)",
          }}
        >
          {/* Top-left corner: suit symbol + value stacked */}
          <div
            className={cn(
              "absolute z-10",
              compact ? "top-1.5 left-1.5" : "top-2.5 left-2.5",
            )}
          >
            <CornerBlock />
          </div>

          {/* Bottom-right corner: same block rotated 180° */}
          <div
            className={cn(
              "absolute z-10",
              compact ? "bottom-1.5 right-1.5" : "bottom-2.5 right-2.5",
            )}
          >
            <CornerBlock rotated />
          </div>

          {/* Center: exercise illustration in cream rounded container */}
          <div
            className="flex-1 min-h-0 flex items-center justify-center"
            style={{
              margin: compact ? "20px 10px 6px 10px" : "32px 14px 8px 14px",
            }}
          >
            <div
              className="w-full h-full flex items-center justify-center overflow-hidden"
              style={{
                background: CREAM_BG,
                borderRadius: "12px",
                padding: compact ? "12px" : "14px",
              }}
            >
              {imageFailed ? (
                // Clean text fallback: exercise name in large bold text
                <span
                  className={cn(
                    "font-display font-black uppercase text-center leading-tight",
                    compact ? "text-sm" : "text-xl",
                  )}
                  style={{
                    color: "oklch(0.15 0.01 260)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {exerciseName || (isJoker ? "Joker" : "Exercise")}
                </span>
              ) : (
                <img
                  src={illustration}
                  alt={exerciseName || "Exercise"}
                  className="w-full h-full"
                  style={{ objectFit: "contain" }}
                  onError={() => setImageFailed(true)}
                />
              )}
            </div>
          </div>

          {/* Below illustration: exercise name (bold all-caps white) + rep count (teal) */}
          <div
            className="text-center px-3"
            style={{ paddingBottom: compact ? "8px" : "12px" }}
          >
            <div
              className={cn(
                "font-display font-bold uppercase leading-tight truncate",
                compact ? "text-[10px]" : "text-xs",
              )}
              style={{
                color: "oklch(0.97 0.005 260)",
                letterSpacing: "0.02em",
              }}
            >
              {exerciseName || (isJoker ? "Joker" : "Exercise")}
            </div>
            {repDisplay && (
              <div
                className={cn(
                  "font-display font-black leading-tight mt-0.5",
                  compact ? "text-[11px]" : "text-sm",
                )}
                style={{
                  color: TEAL_REP,
                  letterSpacing: "0.04em",
                }}
              >
                {repDisplay}
              </div>
            )}
          </div>
        </div>

        {/* Back face — premium MBW branded dark card back (visible only during flip / showBack) */}
        <div
          className="card-face back absolute inset-0 rounded-3xl overflow-hidden"
          style={{
            border: `1px solid ${TEAL_BORDER}`,
            boxShadow:
              "0 0 40px oklch(0.68 0.25 180/0.2),0 8px 40px oklch(0 0 0/0.6)",
          }}
        >
          {/* Card back image */}
          <img
            src="/assets/exercises/backside_of_card.png"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            alt=""
          />
          {/* Subtle grid lines */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, oklch(0.68 0.25 180) 0px, oklch(0.68 0.25 180) 1px, transparent 1px, transparent 24px), repeating-linear-gradient(90deg, oklch(0.68 0.25 180) 0px, oklch(0.68 0.25 180) 1px, transparent 1px, transparent 24px)",
            }}
          />

          {/* Diamond decorative border */}
          <div
            className="absolute inset-3 rounded-2xl border opacity-20"
            style={{ borderColor: "oklch(0.68 0.25 180)" }}
          />

          {/* Center MBW logo mark */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div
              className={cn(
                "rounded-2xl border flex items-center justify-center",
                compact ? "w-10 h-10" : "w-16 h-16",
              )}
              style={{
                borderColor: "oklch(0.68 0.25 180 / 0.5)",
                background: "oklch(0.68 0.25 180 / 0.08)",
                boxShadow: "0 0 20px oklch(0.68 0.25 180 / 0.3)",
              }}
            >
              <span
                className={cn(
                  "font-display font-black tracking-tighter",
                  compact ? "text-sm" : "text-xl",
                )}
                style={{
                  color: "oklch(0.68 0.25 180)",
                  textShadow: "0 0 12px oklch(0.68 0.25 180 / 0.6)",
                }}
              >
                MBW
              </span>
            </div>
            {!compact && (
              <span className="text-xs font-body uppercase tracking-[0.25em] opacity-50 text-primary">
                MyBodyWeight
              </span>
            )}
          </div>

          {/* Corner accents */}
          {[
            "top-2 left-2",
            "top-2 right-2",
            "bottom-2 left-2",
            "bottom-2 right-2",
          ].map((pos) => (
            <div
              key={pos}
              className={cn("absolute w-3 h-3", pos)}
              style={{
                borderColor: "oklch(0.68 0.25 180 / 0.4)",
                borderWidth:
                  pos.includes("top") && pos.includes("left")
                    ? "2px 0 0 2px"
                    : pos.includes("top") && pos.includes("right")
                      ? "2px 2px 0 0"
                      : pos.includes("bottom") && pos.includes("left")
                        ? "0 0 2px 2px"
                        : "0 2px 2px 0",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
