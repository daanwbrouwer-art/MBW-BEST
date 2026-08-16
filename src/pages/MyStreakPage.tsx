import { Logo } from "@/components/Logo";
import { useStreak } from "@/hooks/use-streak";
import { useTier } from "@/hooks/use-tier";
import {
  deriveWeeklyLog,
  formatDateLabel,
  getMonthCalendar,
} from "@/lib/streak";
import { hasEverHadTrial, isWithinPostTrialNudgeWindow } from "@/lib/trial";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function LockedSection({
  locked,
  onSubscribe,
  children,
}: {
  locked: boolean;
  onSubscribe: () => void;
  children: ReactNode;
}) {
  if (!locked) return <>{children}</>;
  const showTrialNudge = hasEverHadTrial() && isWithinPostTrialNudgeWindow();
  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      data-ocid="my-streak.locked_section"
    >
      <div
        className="pointer-events-none select-none"
        style={{ filter: "blur(7px)", opacity: 0.65 }}
        aria-hidden="true"
      >
        {children}
      </div>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-8"
        style={{ background: "oklch(0.08 0.005 260 / 0.6)" }}
      >
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{
            background: "oklch(0.68 0.25 180 / 0.15)",
            border: "1px solid oklch(0.68 0.25 180 / 0.35)",
          }}
        >
          <Lock className="w-5 h-5" style={{ color: "oklch(0.68 0.25 180)" }} />
        </div>
        <p className="font-display font-bold text-sm text-white leading-snug max-w-[220px]">
          {showTrialNudge
            ? "Your full history is saved. Subscribe to see it again →"
            : "Subscribe to see your full streak history."}
        </p>
        <button
          type="button"
          onClick={onSubscribe}
          className="px-5 h-10 rounded-full font-display font-bold text-xs tracking-wide bg-primary text-background transition-smooth hover:opacity-90 active:scale-[0.98]"
          data-ocid="my-streak.subscribe_button"
        >
          Subscribe
        </button>
      </div>
    </div>
  );
}

export default function MyStreakPage() {
  const navigate = useNavigate();
  const { streak } = useStreak();
  const { effectiveTier } = useTier();
  const isSubscriber = effectiveTier === "subscriber";

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const days = useMemo(
    () => getMonthCalendar(viewYear, viewMonth, streak.history),
    [viewYear, viewMonth, streak.history],
  );
  const weeklyLog = useMemo(() => deriveWeeklyLog(streak), [streak]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const bestExerciseLabel = streak.bestExercise
    ? `${streak.bestExercise.name} — ${streak.bestExercise.reps} reps`
    : "No PR yet";

  return (
    <div
      className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto"
      data-ocid="my-streak.page"
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
          onClick={() => navigate({ to: "/home" })}
          data-ocid="my-streak.back_button"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Logo size="sm" showIcon />
        <div className="w-9" />
      </header>

      <div className="relative z-10 flex flex-col flex-1 px-5 pb-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col items-center text-center py-6"
        >
          <span className="text-5xl" aria-hidden="true">
            🔥
          </span>
          <p
            className="font-display font-black text-4xl text-white mt-2 leading-none"
            data-ocid="my-streak.current_weeks"
          >
            {streak.current}
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-display font-bold mt-1">
            week streak
          </p>
          <p className="text-sm text-white/60 font-body mt-3">
            {streak.currentWeekTrainingDays}/{streak.weeklyGoal} days this
            week
          </p>
        </motion.div>

        {/* Motivational stats — visible to every tier */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
          className="grid grid-cols-2 gap-3 mb-6"
        >
          <div
            className="rounded-2xl p-3.5 text-center"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.6)",
            }}
            data-ocid="my-streak.stat.year_days"
          >
            <p className="font-display font-black text-xl text-foreground leading-none">
              {streak.totalTrainingDaysThisYear}
            </p>
            <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wide mt-1.5">
              training days this year
            </p>
          </div>
          <div
            className="rounded-2xl p-3.5 text-center"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.6)",
            }}
            data-ocid="my-streak.stat.best_exercise"
          >
            <p className="font-display font-black text-sm text-foreground leading-tight">
              {bestExerciseLabel}
            </p>
            <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wide mt-1.5">
              strongest move
            </p>
          </div>
        </motion.div>

        {/* Subscriber-only: longest streak + calendar + weekly log */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.4 }}
        >
          <LockedSection
            locked={!isSubscriber}
            onSubscribe={() => navigate({ to: "/subscribe" })}
          >
            <div
              className="rounded-2xl p-3.5 text-center mb-4"
              style={{
                background: "oklch(0.16 0.01 260)",
                border: "1px solid oklch(0.26 0.01 260 / 0.6)",
              }}
              data-ocid="my-streak.stat.longest"
            >
              <p className="font-display font-black text-xl text-foreground leading-none">
                {streak.longest}
              </p>
              <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wide mt-1.5">
                longest streak (weeks)
              </p>
            </div>

            {/* Calendar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="font-display font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
                  Streak History
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goPrevMonth}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary transition-smooth"
                    aria-label="Previous month"
                    data-ocid="my-streak.calendar.prev_month"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-display font-bold text-white/70 w-24 text-center">
                    {monthLabel}
                  </span>
                  <button
                    type="button"
                    onClick={goNextMonth}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary transition-smooth"
                    aria-label="Next month"
                    data-ocid="my-streak.calendar.next_month"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div
                className="rounded-2xl p-3"
                style={{
                  background: "oklch(0.16 0.01 260)",
                  border: "1px solid oklch(0.26 0.01 260 / 0.5)",
                }}
              >
                <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                  {WEEKDAY_LABELS.map((d, i) => (
                    <span
                      key={`${d}-${i}`}
                      className="text-[9px] text-center text-muted-foreground font-body"
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {days.map((day) => (
                    <div
                      key={day.date}
                      className="aspect-square rounded-md flex items-center justify-center text-[9px] font-body"
                      style={{
                        background: !day.inMonth
                          ? "transparent"
                          : day.intensity === "full"
                            ? "oklch(0.68 0.25 180)"
                            : day.intensity === "light"
                              ? "oklch(0.68 0.25 180 / 0.35)"
                              : "oklch(0.2 0.012 260)",
                        color:
                          day.inMonth && day.intensity === "full"
                            ? "oklch(0.08 0.005 260)"
                            : "oklch(0.55 0.008 260)",
                        opacity: day.inMonth ? 1 : 0.12,
                      }}
                    >
                      {day.inMonth ? Number(day.date.slice(-2)) : ""}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-3 justify-end">
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <span
                      className="w-2.5 h-2.5 rounded-sm inline-block"
                      style={{ background: "oklch(0.68 0.25 180 / 0.35)" }}
                    />
                    short
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <span
                      className="w-2.5 h-2.5 rounded-sm inline-block"
                      style={{ background: "oklch(0.68 0.25 180)" }}
                    />
                    long
                  </span>
                </div>
              </div>
            </div>

            {/* Weekly goal log */}
            <div>
              <p className="font-display font-bold text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                Weekly Goal Log
              </p>
              {weeklyLog.length > 0 ? (
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: "oklch(0.16 0.01 260)",
                    border: "1px solid oklch(0.26 0.01 260 / 0.5)",
                  }}
                >
                  {weeklyLog.map((w, i) => (
                    <div
                      key={w.weekStart}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                      style={{
                        borderBottom:
                          i < weeklyLog.length - 1
                            ? "1px solid oklch(0.22 0.01 260 / 0.5)"
                            : "none",
                      }}
                      data-ocid={`my-streak.weekly_log.item.${i + 1}`}
                    >
                      <div className="min-w-0">
                        <p className="font-display font-bold text-xs text-foreground">
                          Week of {formatDateLabel(w.weekStart)}
                        </p>
                        {w.isMilestone && (
                          <p className="text-[10px] text-primary font-body mt-0.5">
                            🔥 {w.streakAtWeek}-week streak reached
                          </p>
                        )}
                      </div>
                      <span
                        className="text-xs font-display font-bold shrink-0"
                        style={{
                          color: w.goalMet
                            ? "oklch(0.68 0.25 180)"
                            : "oklch(0.55 0.008 260)",
                        }}
                      >
                        {w.daysTrained}/{streak.weeklyGoal} {w.goalMet ? "✓" : "✗"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="rounded-2xl px-5 py-8 text-center"
                  style={{
                    background: "oklch(0.16 0.01 260)",
                    border: "1px solid oklch(0.26 0.01 260 / 0.4)",
                  }}
                >
                  <p className="text-xs text-muted-foreground font-body">
                    No training weeks logged yet.
                  </p>
                </div>
              )}
            </div>
          </LockedSection>
        </motion.div>
      </div>
    </div>
  );
}
