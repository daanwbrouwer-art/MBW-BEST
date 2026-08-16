import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useEffect, useRef } from "react";

interface ModifierOverlayProps {
  type: "ace" | "king" | null;
  /** The exercise name to display below the rep count */
  exerciseName?: string;
  /** The final calculated rep count after modifier applied */
  finalReps?: number;
  /** Called when overlay completes (auto or tap dismiss) */
  onDismiss?: () => void;
  /** Backward-compatible alias for onDismiss */
  onComplete?: () => void;
  /** Whether overlay is visible */
  visible?: boolean;
}

export const ModifierOverlay: React.FC<ModifierOverlayProps> = ({
  type,
  exerciseName = "",
  finalReps = 0,
  onDismiss,
  onComplete,
  visible = true,
}) => {
  const dismiss = onDismiss ?? onComplete ?? (() => {});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAce = type === "ace";
  const isShowing = visible && type !== null;

  useEffect(() => {
    if (!isShowing) return;

    // Haptic feedback
    if (isAce) {
      navigator.vibrate?.([200, 50, 200]);
    } else {
      navigator.vibrate?.([300]);
    }

    // Auto-dismiss after 2.5s
    timerRef.current = setTimeout(() => {
      dismiss();
    }, 2500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isShowing, isAce, dismiss]);

  return (
    <AnimatePresence>
      {isShowing && (
        <motion.div
          key={`modifier-${type}`}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{
            type: "spring",
            stiffness: 320,
            damping: 26,
            duration: 0.4,
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center cursor-pointer select-none"
          style={{
            background: isAce
              ? "radial-gradient(ellipse 70% 60% at 50% 40%, oklch(0.65 0.25 30) 0%, oklch(0.10 0.02 20) 45%, oklch(0.08 0.008 260) 70%)"
              : "radial-gradient(ellipse 70% 60% at 50% 40%, oklch(0.55 0.18 250) 0%, oklch(0.09 0.02 250) 45%, oklch(0.08 0.008 260) 70%)",
          }}
          onClick={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            dismiss();
          }}
          data-ocid="modifier-overlay.panel"
          aria-label={isAce ? "Reps Doubled modifier" : "Reps Halved modifier"}
        >
          {/* Corner badge */}
          <div
            className="absolute top-6 right-6 px-3 py-1.5 rounded-full text-sm font-black tracking-wider"
            style={{
              background: isAce
                ? "linear-gradient(135deg, oklch(0.83 0.19 84), oklch(0.72 0.22 50))"
                : "linear-gradient(135deg, oklch(0.72 0.10 240), oklch(0.78 0.04 240))",
              color: isAce ? "oklch(0.12 0.015 60)" : "oklch(0.10 0.015 250)",
              boxShadow: isAce
                ? "0 0 16px oklch(0.83 0.19 84 / 0.5), 0 2px 8px oklch(0 0 0 / 0.4)"
                : "0 0 16px oklch(0.72 0.10 240 / 0.5), 0 2px 8px oklch(0 0 0 / 0.4)",
            }}
          >
            {isAce ? "\u00d72" : "\u00f72"}
          </div>

          {/* Main content */}
          <div className="flex flex-col items-center gap-3 px-8">
            {/* MODIFIER label */}
            <p
              className="text-xs font-bold uppercase tracking-[0.3em]"
              style={{
                color: isAce ? "oklch(0.83 0.19 84)" : "oklch(0.72 0.10 240)",
              }}
            >
              MODIFIER
            </p>

            {/* REPS text */}
            <p
              className="font-black leading-none"
              style={{ fontSize: "3.25rem", color: "oklch(0.97 0.005 260)" }}
            >
              REPS
            </p>

            {/* DOUBLED / HALVED text */}
            <p
              className="font-black leading-none text-center"
              style={{
                fontSize: "4.5rem",
                background: isAce
                  ? "linear-gradient(135deg, oklch(0.83 0.19 84) 0%, oklch(0.65 0.25 30) 100%)"
                  : "linear-gradient(135deg, oklch(0.72 0.10 240) 0%, oklch(0.78 0.04 240) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textShadow: "none",
                filter: isAce
                  ? "drop-shadow(0 0 18px oklch(0.83 0.19 84 / 0.55))"
                  : "drop-shadow(0 0 18px oklch(0.72 0.10 240 / 0.55))",
              }}
            >
              {isAce ? "DOUBLED" : "HALVED"}
            </p>

            {/* Separator */}
            <div
              className="w-16 h-px my-1"
              style={{
                background: isAce
                  ? "linear-gradient(90deg, transparent, oklch(0.83 0.19 84), transparent)"
                  : "linear-gradient(90deg, transparent, oklch(0.72 0.10 240), transparent)",
              }}
            />

            {/* Giant rep number */}
            <p
              className="font-black leading-none"
              style={{
                fontSize: "6rem",
                color: "oklch(0.97 0.005 260)",
                lineHeight: 1,
              }}
            >
              {finalReps}
            </p>

            {/* REPS below number */}
            <p
              className="font-bold text-sm tracking-[0.2em] uppercase"
              style={{
                color: isAce ? "oklch(0.83 0.19 84)" : "oklch(0.72 0.10 240)",
              }}
            >
              REPS
            </p>

            {/* Exercise name */}
            {exerciseName && (
              <p
                className="text-sm font-medium text-center mt-1"
                style={{ color: "oklch(0.92 0.01 260 / 0.65)" }}
              >
                {exerciseName}
              </p>
            )}
          </div>

          {/* Tap to continue hint */}
          <p
            className="absolute bottom-10 text-xs font-medium tracking-widest uppercase"
            style={{ color: "oklch(0.92 0.01 260 / 0.3)" }}
          >
            TAP TO CONTINUE
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ModifierOverlay;
