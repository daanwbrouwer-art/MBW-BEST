import type { AchievementView } from "@/lib/achievementEngine";
import { CATEGORY_META } from "@/types/achievements";
import { Lock } from "lucide-react";

const TEAL = "#1AD6A0";
const GOLD = "#f5c518";

function formatUnlockedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** 2-column grid tile (Prompt 15, Part 2) — unlocked / in-progress / hidden("?") / almost-unlocked-gold. */
export function AchievementProgressCard({
  achievement,
  onTap,
}: {
  achievement: AchievementView;
  onTap: () => void;
}) {
  const {
    name,
    category,
    progress,
    target,
    unlocked,
    almostUnlocked,
    hidden,
    unitLabel,
    unlockedAt,
  } = achievement;
  const emoji = CATEGORY_META[category].emoji;
  const isSecret = hidden && !unlocked && !almostUnlocked;
  const isBinary = target === 1;
  const pct = target > 0 ? Math.min(100, (progress / target) * 100) : 0;

  const baseClass =
    "relative aspect-square w-full rounded-2xl flex flex-col items-center justify-center gap-1.5 p-3 text-center transition-smooth active:scale-[0.97]";

  if (isSecret) {
    return (
      <button
        type="button"
        onClick={onTap}
        className={baseClass}
        style={{ background: "#1a1a1a", border: "1px solid oklch(0.26 0.01 260 / 0.5)" }}
        data-ocid={`achievement.card.${achievement.id}`}
      >
        <span className="text-4xl leading-none" style={{ color: "oklch(0.4 0.01 260)" }}>
          ?
        </span>
        <span className="font-display font-bold text-sm text-white">???</span>
        <span className="font-body text-[10px] italic" style={{ color: TEAL }}>
          Secret achievement
        </span>
      </button>
    );
  }

  if (almostUnlocked) {
    return (
      <button
        type="button"
        onClick={onTap}
        className={`${baseClass} overflow-hidden justify-between`}
        style={{ background: "#1a1a1a", border: `1px solid ${GOLD}66` }}
        data-ocid={`achievement.card.${achievement.id}`}
      >
        <div className="flex-1 flex items-center justify-center">
          <span className="text-4xl leading-none" style={{ filter: "grayscale(0.3)", opacity: 0.75 }}>
            {emoji}
          </span>
        </div>
        <span className="font-display font-bold text-xs text-white leading-tight">{name}</span>
        <div
          className="w-full h-1.5 rounded-full overflow-hidden mt-1.5"
          style={{ background: "oklch(0.22 0.012 260)" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: "100%", background: GOLD, boxShadow: `0 0 8px ${GOLD}` }}
          />
        </div>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2"
          style={{ background: "oklch(0.08 0.005 260 / 0.72)" }}
        >
          <Lock className="w-5 h-5" style={{ color: GOLD }} />
          <span className="font-display font-bold text-[10px] text-center" style={{ color: GOLD }}>
            Subscribe to unlock
          </span>
        </div>
      </button>
    );
  }

  if (unlocked) {
    return (
      <button
        type="button"
        onClick={onTap}
        className={baseClass}
        style={{
          background: "#1a1a1a",
          border: hidden ? "1px solid #f59e0b99" : `1px solid ${TEAL}90`,
          boxShadow: hidden ? "0 0 16px #f59e0b33" : `0 0 16px ${TEAL}22`,
        }}
        data-ocid={`achievement.card.${achievement.id}`}
      >
        <span
          className="absolute top-2 right-2 text-[8px] font-display font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full"
          style={{ background: `${TEAL}22`, color: TEAL }}
        >
          Unlocked
        </span>
        <span className="text-4xl leading-none">{emoji}</span>
        <span className="font-display font-bold text-xs text-white leading-tight">{name}</span>
        {unlockedAt && (
          <span className="text-[9px] font-body" style={{ color: "oklch(0.55 0.008 260)" }}>
            Unlocked {formatUnlockedDate(unlockedAt)}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onTap}
      className={baseClass}
      style={{ background: "#1a1a1a", border: "1px solid oklch(0.26 0.01 260 / 0.5)" }}
      data-ocid={`achievement.card.${achievement.id}`}
    >
      <span className="text-4xl leading-none" style={{ opacity: 0.6, filter: "saturate(0.5)" }}>
        {emoji}
      </span>
      <span className="font-display font-bold text-xs text-white leading-tight">{name}</span>
      {isBinary ? (
        <Lock className="w-4 h-4 mt-1" style={{ color: "oklch(0.45 0.008 260)" }} />
      ) : (
        <div className="w-full flex flex-col items-center gap-1 mt-1">
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: "oklch(0.22 0.012 260)" }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, background: TEAL, boxShadow: `0 0 6px ${TEAL}` }}
            />
          </div>
          <span
            className="text-[9px] font-body tabular-nums"
            style={{ color: "oklch(0.6 0.008 260)" }}
            data-ocid={`achievement.card.${achievement.id}.progress_text`}
          >
            {progress.toLocaleString("en-US")}/{target.toLocaleString("en-US")}
            {unitLabel ? ` ${unitLabel}` : ""}
          </span>
        </div>
      )}
    </button>
  );
}
