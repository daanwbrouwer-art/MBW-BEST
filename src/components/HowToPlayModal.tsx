import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

const STEPS = [
  {
    number: 1,
    title: "Warm Up",
    description:
      "Start with a brief warm-up to prepare your body before drawing your first card.",
  },
  {
    number: 2,
    title: "Shuffle the Deck",
    description:
      "Your deck is automatically shuffled at the start of every workout — no two sessions are the same.",
  },
  {
    number: 3,
    title: "Draw a Card",
    description: 'Tap "Next Card" to draw the top card from the deck.',
  },
  {
    number: 4,
    title: "Perform the Exercise",
    description:
      "Complete the exercise shown on the card — reps, exercise name, and illustration are all displayed.",
  },
  {
    number: 5,
    title: "Keep Going",
    description:
      "Draw the next card and repeat until your workout is complete.",
  },
];

interface HowToPlayModalProps {
  open: boolean;
  onClose: () => void;
}

export function HowToPlayModal({ open, onClose }: HowToPlayModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Escape closes; focus moves into the sheet on open, stays inside it on
  // Tab, and returns to whatever opened it on close.
  useEffect(() => {
    if (!open) return;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusable = () =>
      Array.from(
        sheetRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    const raf = requestAnimationFrame(() => focusable()[0]?.focus());
    const onKey = (e: KeyboardEvent) => {
      // Only while this sheet is the topmost dialog: another overlay opened
      // on top handles its own keys.
      const dialogs = document.querySelectorAll(
        '[role="dialog"], [role="alertdialog"]',
      );
      if (dialogs[dialogs.length - 1] !== sheetRef.current) return;
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = !!active && !!sheetRef.current?.contains(active);
      if (e.shiftKey && (active === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[55]"
            style={{ background: "oklch(0 0 0 / 0.72)" }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 z-[60] max-w-[430px] mx-auto rounded-t-3xl overflow-hidden flex flex-col max-h-[88vh]"
            style={{
              background: "oklch(0.14 0.012 var(--neutral-hue))",
              border: "1px solid oklch(0.26 0.01 var(--neutral-hue) / 0.6)",
              borderBottom: "none",
              boxShadow: "0 -16px 60px oklch(0 0 0 / 0.55)",
            }}
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="how-to-play-title"
            data-ocid="how-to-play.dialog"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div
                className="w-9 h-1 rounded-full"
                style={{
                  background: "oklch(0.36 0.01 var(--neutral-hue) / 0.7)",
                }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-2 pb-4 shrink-0">
              <div>
                <p
                  className="text-xs font-display font-bold tracking-[0.22em] uppercase mb-0.5"
                  style={{ color: "oklch(var(--primary))" }}
                >
                  Card Workout
                </p>
                <h2
                  id="how-to-play-title"
                  className="font-display font-black text-xl text-foreground tracking-tight"
                >
                  How to Play
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-smooth text-muted-foreground hover:text-foreground"
                style={{
                  background: "oklch(0.20 0.01 var(--neutral-hue))",
                  border: "1px solid oklch(0.30 0.01 var(--neutral-hue) / 0.5)",
                }}
                aria-label="Close"
                data-ocid="how-to-play.close_button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Divider */}
            <div
              className="mx-6 h-px shrink-0"
              style={{
                background: "oklch(0.26 0.01 var(--neutral-hue) / 0.5)",
              }}
            />

            {/* Scrollable content — steps + tip card. Constrained by the sheet's
                max-h-[88vh] + flex-col above, so long content scrolls instead of
                clipping the CTA button off the bottom of short viewports. */}
            <div className="overflow-y-auto flex-1 min-h-0">
              {/* Steps */}
              <div className="px-6 pt-5 pb-2">
                <ol className="flex flex-col gap-0">
                  {STEPS.map((step, i) => (
                    <li key={step.number} className="flex gap-4">
                      {/* Number + connector line */}
                      <div className="flex flex-col items-center shrink-0">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background:
                              i === 0
                                ? "oklch(var(--primary))"
                                : "oklch(0.20 0.01 var(--neutral-hue))",
                            border: `1px solid ${
                              i === 0
                                ? "oklch(var(--primary))"
                                : "oklch(0.32 0.01 var(--neutral-hue) / 0.6)"
                            }`,
                          }}
                        >
                          <span
                            className="font-display font-black text-xs"
                            style={{
                              color:
                                i === 0
                                  ? "oklch(0.12 0.008 var(--neutral-hue))"
                                  : "oklch(0.65 0.008 var(--neutral-hue))",
                            }}
                          >
                            {step.number}
                          </span>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div
                            className="w-px flex-1 min-h-[20px]"
                            style={{
                              background:
                                "oklch(0.28 0.01 var(--neutral-hue) / 0.5)",
                            }}
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div
                        className={`pb-5 flex-1 min-w-0 ${
                          i === STEPS.length - 1 ? "pb-1" : ""
                        }`}
                      >
                        <p className="font-display font-bold text-sm text-foreground leading-tight mb-1">
                          {step.title}
                        </p>
                        <p className="text-xs text-muted-foreground font-body leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Tip card */}
              <div className="mx-6 mb-6 mt-1">
                <div
                  className="rounded-2xl px-4 py-3.5"
                  style={{
                    background: "oklch(var(--primary) / 0.08)",
                    border: "1px solid oklch(var(--primary) / 0.2)",
                  }}
                >
                  <p
                    className="text-xs font-display font-bold tracking-[0.18em] uppercase mb-1"
                    style={{ color: "oklch(var(--primary))" }}
                  >
                    Fun Tip
                  </p>
                  <p className="text-xs text-muted-foreground font-body leading-relaxed">
                    Share the deck with a friend and complete it together.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="px-6 pt-4 pb-10 shrink-0">
              <Button
                className="w-full h-12 font-display font-black text-sm tracking-[0.15em] rounded-2xl"
                onClick={onClose}
                data-ocid="how-to-play.confirm_button"
              >
                GOT IT
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
