import { Logo } from "@/components/Logo";
import { resolveExerciseIllustration } from "@/data/exerciseAssets";
import { useOnboarding } from "@/hooks/use-onboarding";
import { readStreak } from "@/lib/streak";
import { useWorkoutStore } from "@/store/workout";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { motion } from "motion/react";

interface ExerciseTotal {
  name: string;
  reps: number;
}

/**
 * Lifetime reps per exercise, guest-inclusive: sourced from streak.ts's
 * per-day exercise log (src/types/streak.ts StreakDayEntry.exercises),
 * which already accumulates for guests and registered accounts alike —
 * unlike UserProfile.repsByExercise (src/backend.ts), which only exists
 * once a workout has been saved through the backend and guests never do
 * that (see the `!guestMode` guard in WorkoutSummaryPage.tsx's save
 * effect). Reusing this log is what makes this page guest-safe.
 */
function lifetimeRepsByExercise(isGuest: boolean): ExerciseTotal[] {
  const { history } = readStreak(isGuest);
  const totals = new Map<string, number>();
  for (const day of history) {
    for (const ex of day.exercises) {
      totals.set(ex.name, (totals.get(ex.name) ?? 0) + ex.reps);
    }
  }
  return [...totals.entries()]
    .map(([name, reps]) => ({ name, reps }))
    .sort((a, b) => b.reps - a.reps);
}

export default function ExerciseProgressPage() {
  const navigate = useNavigate();
  const guestModeFlag = useWorkoutStore((s) => s.guestMode);
  const isEmailAuth = localStorage.getItem("mbw_user") !== null;
  const isGuest = guestModeFlag && !isEmailAuth;
  const { gender } = useOnboarding();

  const rows = lifetimeRepsByExercise(isGuest);

  return (
    <div
      className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto relative"
      data-ocid="exercise-progress.page"
    >
      <div
        className="absolute inset-0 pointer-events-none max-w-[430px] mx-auto"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.22 0.04 180 / 0.22) 0%, transparent 60%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4">
        <button
          type="button"
          className="w-9 h-9 rounded-xl bg-card/80 border border-border/60 flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-smooth"
          onClick={() => navigate({ to: "/achievements" })}
          data-ocid="exercise-progress.back_button"
          aria-label="Go back to achievements"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Logo size="sm" showIcon />
        <div className="w-9" />
      </header>

      <div className="relative z-10 flex flex-col flex-1 px-5 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="pt-2 pb-6"
        >
          <h1 className="font-display font-black text-2xl text-foreground mb-1">
            Exercise Progress
          </h1>
          <p className="text-xs text-muted-foreground font-body">
            Lifetime reps, exercise by exercise
          </p>
        </motion.div>

        {rows.length === 0 ? (
          <div
            className="rounded-2xl px-5 py-10 text-center"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.4)",
            }}
            data-ocid="exercise-progress.empty_state"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "oklch(0.68 0.25 180 / 0.1)" }}
            >
              <Dumbbell
                className="w-7 h-7"
                style={{ color: "oklch(0.68 0.25 180 / 0.5)" }}
              />
            </div>
            <p className="font-display font-bold text-sm text-foreground mb-1">
              No workouts yet
            </p>
            <p className="text-white/70 font-body text-xs">
              Complete a workout to start tracking your progress per exercise.
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.45 }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.5)",
            }}
            data-ocid="exercise-progress.list"
          >
            {rows.map((row, i) => (
              <div
                key={row.name}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom:
                    i < rows.length - 1
                      ? "1px solid oklch(0.22 0.01 260 / 0.5)"
                      : "none",
                }}
                data-ocid={`exercise-progress.item.${i + 1}`}
              >
                <div
                  className="w-12 h-12 rounded-xl overflow-hidden shrink-0"
                  style={{ background: "oklch(0.13 0.01 260)" }}
                >
                  <img
                    src={resolveExerciseIllustration(row.name, gender)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-body text-sm text-foreground flex-1 min-w-0 truncate">
                  {row.name}
                </span>
                <div className="flex items-baseline gap-1 shrink-0">
                  <span
                    className="font-display font-black text-lg leading-none"
                    style={{ color: "oklch(0.68 0.25 180)" }}
                  >
                    {row.reps}
                  </span>
                  <span
                    className="font-body text-[10px] uppercase tracking-wide"
                    style={{ color: "oklch(0.75 0.008 260)" }}
                  >
                    reps
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
