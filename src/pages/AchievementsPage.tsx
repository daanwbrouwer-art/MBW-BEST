import { AchievementDetailSheet } from "@/components/AchievementDetailSheet";
import { AchievementProgressCard } from "@/components/AchievementProgressCard";
import { Logo } from "@/components/Logo";
import { useAchievements } from "@/hooks/use-achievements";
import type { AchievementView } from "@/lib/achievementEngine";
import { useWorkoutStore } from "@/store/workout";
import { type AchievementCategory, CATEGORY_META } from "@/types/achievements";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BarChart2, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

const TEAL = "#1AD6A0";

const CATEGORIES: (AchievementCategory | "all")[] = [
  "all",
  "card-draw",
  "special-cards",
  "reps",
  "streaks",
  "sessions",
  "equipment",
  "time",
  "social",
  "secret",
];

export default function AchievementsPage() {
  const navigate = useNavigate();
  const {
    achievements,
    unlockedCount,
    totalVisibleCount,
    isLoading,
    markSeen,
  } = useAchievements();
  const guestMode = useWorkoutStore((s) => s.guestMode);
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | "all">(
    "all",
  );
  const [detailAchievement, setDetailAchievement] = useState<AchievementView | null>(
    null,
  );

  // Visiting the page clears the nav bar's red "unseen unlock" dot.
  useEffect(() => {
    markSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered =
    activeCategory === "all"
      ? achievements
      : achievements.filter((a) => a.category === activeCategory);

  // In-progress first (closest to completion first), unlocked after, hidden last.
  const sorted = [...filtered].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? 1 : -1;
    if (!a.unlocked) {
      const aIsSecret = a.hidden && !a.almostUnlocked;
      const bIsSecret = b.hidden && !b.almostUnlocked;
      if (aIsSecret !== bIsSecret) return aIsSecret ? 1 : -1;
      const aPct = a.progress / a.target;
      const bPct = b.progress / b.target;
      return bPct - aPct;
    }
    return 0;
  });

  const overallPct =
    totalVisibleCount > 0 ? Math.round((unlockedCount / totalVisibleCount) * 100) : 0;

  return (
    <div
      className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto pb-24"
      data-ocid="achievements.page"
    >
      <AchievementDetailSheet
        achievement={detailAchievement}
        open={detailAchievement !== null}
        onOpenChange={(open) => {
          if (!open) setDetailAchievement(null);
        }}
      />

      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none max-w-[430px] mx-auto"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.22 0.04 180 / 0.22) 0%, transparent 55%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4">
        <button
          type="button"
          className="w-9 h-9 rounded-xl bg-card/80 border border-border/60 flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-smooth"
          onClick={() => navigate({ to: "/home" })}
          data-ocid="achievements.back_button"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Logo size="sm" showIcon />
        <button
          type="button"
          className="w-9 h-9 rounded-xl bg-card/80 border border-border/60 flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-smooth"
          onClick={() => navigate({ to: "/progress" })}
          data-ocid="achievements.progress_button"
          aria-label="View exercise progress"
        >
          <BarChart2 className="w-4 h-4" />
        </button>
      </header>

      {/* Title + count + overall progress bar */}
      <div className="relative z-10 px-5 pt-2 pb-5">
        <div className="flex items-center gap-3 mb-1">
          <Trophy className="w-6 h-6 text-primary" />
          <h1 className="font-display font-black text-2xl text-foreground">
            Achievements
          </h1>
        </div>
        <p className="text-sm text-muted-foreground font-body mb-3">
          {unlockedCount} / {totalVisibleCount} unlocked
        </p>
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ background: "oklch(0.22 0.012 260)" }}
          data-ocid="achievements.overall_progress_bar"
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${overallPct}%`, background: TEAL, boxShadow: `0 0 8px ${TEAL}` }}
          />
        </div>
      </div>

      {/* Guest banner — progress is tracked locally even for guests, but not synced across devices */}
      {guestMode && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 mx-5 mb-4 rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{
            background: "oklch(0.17 0.015 180 / 0.25)",
            border: "1px solid oklch(0.68 0.25 180 / 0.3)",
          }}
        >
          <Trophy className="w-5 h-5 shrink-0 text-primary" />
          <p className="text-sm text-foreground font-body">
            Your progress is saved on this device. Create an account to keep it safe
            everywhere you play.
          </p>
        </motion.div>
      )}

      {/* Category tabs */}
      <div className="relative z-10 px-5 mb-4">
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            const meta = cat === "all" ? { label: "All", emoji: "🏆" } : CATEGORY_META[cat];
            const catAchievements =
              cat === "all"
                ? achievements
                : achievements.filter((a) => a.category === cat);
            const catUnlocked = catAchievements.filter((a) => a.unlocked).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className="flex-shrink-0 rounded-xl px-3 py-2 flex items-center gap-1.5 transition-smooth"
                style={{
                  background: isActive
                    ? "oklch(0.68 0.25 180 / 0.15)"
                    : "oklch(0.16 0.01 260)",
                  border: isActive
                    ? "1px solid oklch(0.68 0.25 180 / 0.4)"
                    : "1px solid oklch(0.26 0.01 260 / 0.5)",
                  color: isActive ? "oklch(0.68 0.25 180)" : "oklch(0.78 0.008 260)",
                }}
                data-ocid={`achievements.filter.${cat}`}
              >
                <span className="text-sm">{meta.emoji}</span>
                <span className="font-display font-bold text-[11px] uppercase tracking-wider">
                  {meta.label}
                </span>
                <span className="text-[10px] font-body opacity-60">
                  {catUnlocked}/{catAchievements.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {/* 2-column achievement grid */}
      {!isLoading && (
        <div className="relative z-10 px-5">
          {activeCategory !== "all" && (
            <p className="font-display font-bold text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
              {CATEGORY_META[activeCategory].label} —{" "}
              {sorted.filter((a) => a.unlocked).length} unlocked
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {sorted.map((achievement) => (
              <AchievementProgressCard
                key={achievement.id}
                achievement={achievement}
                onTap={() => setDetailAchievement(achievement)}
              />
            ))}
          </div>

          {sorted.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground font-body text-sm">
                No achievements in this category.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
