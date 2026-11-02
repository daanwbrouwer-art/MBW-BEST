import { cn } from "@/lib/utils";
import type { DeckCategory, DeckDifficulty } from "@/types/workout";
import {
  DECK_CATEGORY_DESCRIPTION,
  DECK_CATEGORY_ICON,
  DECK_CATEGORY_LABEL,
} from "@/types/workout";
import { motion } from "motion/react";

/** Difficulty badge color tokens. Beginner is GREEN per spec. */
const DIFFICULTY_BADGE_COLOR: Record<DeckDifficulty, string> = {
  Beginner: "oklch(0.72 0.19 145)",
  Advanced: "oklch(var(--prestige))",
  Pro: "oklch(var(--energy))",
};

/** CategoryDeckCard — used in future contexts where a DeckCard component is needed externally */
interface DeckCardProps {
  category: DeckCategory;
  selected?: boolean;
  onClick?: () => void;
  index?: number;
  className?: string;
  /** Optional difficulty badge to render on the card. */
  difficulty?: DeckDifficulty;
  /** Whether the deck is locked (subscriber-only). Defaults to false (open to all). */
  locked?: boolean;
}

export function DeckCard({
  category,
  selected,
  onClick,
  index = 0,
  className,
  difficulty,
  locked = false,
}: DeckCardProps) {
  const suits = ["♥", "♠", "♦", "♣"];
  const badgeColor = difficulty
    ? DIFFICULTY_BADGE_COLOR[difficulty]
    : "oklch(var(--primary))";
  const badgeBorder = badgeColor.replace(")", " / 0.35)");
  const badgeBg = badgeColor.replace(")", " / 0.14)");

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.08,
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-3xl border text-left flex flex-col gap-3 p-4 transition-smooth",
        selected
          ? "border-primary/70 shadow-[0_0_36px_oklch(0.68_0.25_180/0.3),inset_0_1px_0_oklch(0.68_0.25_180/0.2)]"
          : "border-border/50 bg-card hover:border-primary/45 hover:shadow-[0_0_20px_oklch(0.68_0.25_180/0.12)]",
        className,
      )}
      style={{ minHeight: "9rem" }}
      data-ocid={`deck-card.item.${index + 1}`}
    >
      {/* Ambient glow on selected */}
      {selected && (
        <div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{
            background:
              "radial-gradient(ellipse at 20% 50%, oklch(var(--primary) / 0.12) 0%, transparent 65%)",
          }}
        />
      )}

      {/* Top-right corner ambient */}
      <div
        className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 100% 0%, oklch(var(--primary) / 0.08) 0%, transparent 70%)",
        }}
      />

      {/* Difficulty badge — top-right. GREEN for Beginner. */}
      {difficulty && (
        <span
          className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-display font-black tracking-widest uppercase"
          style={{
            background: badgeBg,
            color: badgeColor,
            border: `1px solid ${badgeBorder}`,
          }}
          data-ocid={`deck-card.difficulty_badge.${difficulty.toLowerCase()}`}
        >
          {difficulty}
        </span>
      )}

      {/* Icon badge */}
      <div
        className="relative w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
        style={{
          background: selected
            ? "oklch(0.18 0.02 var(--primary-h) / 0.6)"
            : "oklch(0.18 0.015 var(--primary-h) / 0.4)",
          border: selected
            ? "1px solid oklch(var(--primary) / 0.4)"
            : "1px solid oklch(var(--primary) / 0.2)",
          color: "oklch(var(--primary))",
        }}
      >
        {DECK_CATEGORY_ICON[category]}
      </div>

      {/* Text */}
      <div className="relative flex-1 min-w-0">
        <h3
          className="font-display font-black text-base leading-tight"
          style={{
            color: selected
              ? "oklch(0.96 0.02 var(--primary-h))"
              : "oklch(0.94 0.01 var(--neutral-hue))",
          }}
        >
          {DECK_CATEGORY_LABEL[category]}
        </h3>
        <p className="text-xs text-muted-foreground font-body mt-1 leading-snug line-clamp-2">
          {DECK_CATEGORY_DESCRIPTION[category]}
        </p>
      </div>

      {/* Suits row */}
      <div className="relative flex gap-1">
        {suits.map((s) => (
          <span
            key={s}
            className="text-xs font-display"
            style={{
              color: selected
                ? "oklch(var(--primary) / 0.7)"
                : "oklch(0.45 0.01 var(--neutral-hue))",
            }}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Lock indicator — only shown when explicitly locked (not for open decks) */}
      {locked && (
        <span
          className="absolute bottom-3 right-3 text-xs font-display font-bold uppercase tracking-wider"
          style={{ color: "oklch(var(--prestige))" }}
        >
          Sub
        </span>
      )}
    </motion.button>
  );
}
