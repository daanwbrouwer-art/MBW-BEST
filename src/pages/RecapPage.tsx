import { Logo } from "@/components/Logo";
import { readAchievementUnlockTimes } from "@/lib/achievementEngine";
import { readSessions } from "@/lib/achievementSessionLog";
import {
  MONTH_NAMES,
  type RecapPeriod,
  type RecapStats,
  computeRecap,
  currentPeriod,
  isPeriodInProgress,
  nextPeriod,
  periodLabel,
  previousPeriod,
} from "@/lib/recap";
import { useWorkoutStore } from "@/store/workout";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

/** Reads ?view=month|year&y=2026&m=10 (m is 0-11) so Home can link to a
 * specific recap ("Your October recap is ready"). */
function initialPeriod(): RecapPeriod {
  const q = new URLSearchParams(window.location.search);
  const now = new Date();
  const y = Number(q.get("y")) || now.getFullYear();
  if (q.get("view") === "year") return { kind: "year", year: y };
  const m = Number(q.get("m"));
  return {
    kind: "month",
    year: y,
    month: Number.isInteger(m) && m >= 0 && m <= 11 && q.has("m") ? m : now.getMonth(),
  };
}

export default function RecapPage() {
  const navigate = useNavigate();
  const guestMode = useWorkoutStore((s) => s.guestMode);
  const isGuest = guestMode && localStorage.getItem("mbw_user") === null;
  const [period, setPeriod] = useState<RecapPeriod>(initialPeriod);

  const sessions = useMemo(() => readSessions(isGuest), [isGuest]);
  const unlocks = useMemo(() => readAchievementUnlockTimes(isGuest), [isGuest]);
  const stats = useMemo(
    () => computeRecap(sessions, unlocks, period),
    [sessions, unlocks, period],
  );

  const inProgress = isPeriodInProgress(period);
  const canGoNext = !inProgress;
  const isYear = period.kind === "year";

  const switchKind = (kind: "month" | "year") => {
    if (kind === period.kind) return;
    setPeriod(
      kind === "year"
        ? { kind: "year", year: period.year }
        : period.year === new Date().getFullYear()
          ? currentPeriod("month")
          : { kind: "month", year: period.year, month: 11 },
    );
  };

  return (
    <div
      className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto relative"
      data-ocid="recap.page"
    >
      <div
        className="absolute inset-0 pointer-events-none max-w-[430px] mx-auto"
        style={{
          background: isYear
            ? "radial-gradient(ellipse 90% 45% at 50% 0%, oklch(var(--prestige) / 0.28) 0%, transparent 65%)"
            : "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(var(--primary) / 0.18) 0%, transparent 60%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4">
        <button
          type="button"
          className="w-9 h-9 rounded-xl bg-card/80 border border-border/60 flex items-center justify-center text-muted-foreground transition-smooth"
          onClick={() => navigate({ to: "/home" })}
          aria-label="Go back"
          data-ocid="recap.back_button"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Logo size="sm" showIcon />
        <div className="w-9" />
      </header>

      <div className="relative z-10 flex flex-col flex-1 px-5 pb-10 gap-4">
        {/* Month / Year switch */}
        <div
          className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-card border border-border/60"
          role="tablist"
        >
          {(["month", "year"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={period.kind === k}
              onClick={() => switchKind(k)}
              className="h-10 rounded-xl font-display font-bold text-xs uppercase tracking-widest transition-smooth"
              style={
                period.kind === k
                  ? {
                      background: k === "year" ? "oklch(var(--prestige))" : "oklch(var(--primary))",
                      color: "oklch(0.1 0.01 var(--neutral-hue))",
                    }
                  : { color: "oklch(var(--muted-foreground))" }
              }
              data-ocid={`recap.tab.${k}`}
            >
              {k === "month" ? "Monthly Recap" : "Year in Review"}
            </button>
          ))}
        </div>

        {/* Period picker */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPeriod(previousPeriod(period))}
            className="w-9 h-9 rounded-xl bg-card border border-border/60 flex items-center justify-center"
            aria-label={isYear ? "Previous year" : "Previous month"}
            data-ocid="recap.prev_button"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <h1 className="font-display font-black text-xl text-foreground">
              {isYear ? `${period.year} in Review` : periodLabel(period)}
            </h1>
            <p className="text-xs text-muted-foreground font-body">
              {inProgress ? "So far — the full recap lands when it ends" : "Final recap"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => canGoNext && setPeriod(nextPeriod(period))}
            disabled={!canGoNext}
            className="w-9 h-9 rounded-xl bg-card border border-border/60 flex items-center justify-center disabled:opacity-30"
            aria-label={isYear ? "Next year" : "Next month"}
            data-ocid="recap.next_button"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {stats.workouts === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
            <p className="text-4xl mb-2" aria-hidden="true">
              🃏
            </p>
            <p className="font-display font-bold text-foreground">
              No workouts {inProgress ? "yet" : "in this period"}
            </p>
            <p className="text-sm text-muted-foreground font-body mt-1">
              Every workout you finish lands here — draw your first card and
              this {isYear ? "year" : "month"} starts filling up.
            </p>
          </div>
        ) : (
          <RecapBody stats={stats} period={period} />
        )}
      </div>
    </div>
  );
}

function RecapBody({ stats, period }: { stats: RecapStats; period: RecapPeriod }) {
  const isYear = period.kind === "year";
  const unit = isYear ? "year" : "month";
  const delta = stats.workouts - stats.previousWorkouts;
  const hours = Math.floor(stats.minutes / 60);
  const mins = stats.minutes % 60;

  const tiles: [string, string][] = [
    [String(stats.workouts), "Workouts"],
    [String(stats.trainingDays), "Training days"],
    [stats.reps.toLocaleString(), "Reps"],
    [stats.cards.toLocaleString(), "Cards drawn"],
    [hours > 0 ? `${hours}h ${mins}m` : `${mins}m`, "Time trained"],
    [`${stats.calories.toLocaleString()}`, "Est. kcal"],
  ];

  return (
    <motion.div
      key={`${period.kind}-${period.year}-${period.kind === "month" ? period.month : ""}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-4"
    >
      {/* Headline */}
      <div
        className="rounded-3xl p-5 text-center"
        style={{
          background: isYear
            ? "linear-gradient(135deg, oklch(var(--prestige) / 0.3), oklch(var(--primary) / 0.18))"
            : "oklch(var(--primary) / 0.1)",
          border: `1px solid ${isYear ? "oklch(var(--prestige) / 0.5)" : "oklch(var(--primary) / 0.3)"}`,
        }}
      >
        <p className="font-display font-black text-5xl text-foreground leading-none">
          {stats.reps.toLocaleString()}
        </p>
        <p className="text-xs uppercase tracking-widest font-display font-bold text-muted-foreground mt-1">
          reps this {unit}
        </p>
        <p className="text-sm font-body text-foreground/80 mt-3">
          {stats.previousWorkouts === 0
            ? `Your first ${unit} on the board.`
            : delta > 0
              ? `${delta} more workout${delta === 1 ? "" : "s"} than last ${unit} 📈`
              : delta === 0
                ? `As many workouts as last ${unit} — steady.`
                : `${-delta} fewer than last ${unit} — time to win it back.`}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tiles.map(([v, l]) => (
          <div key={l} className="rounded-2xl bg-card border border-border/60 p-3 text-center">
            <p className="font-display font-black text-lg text-foreground leading-tight">{v}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold mt-0.5">
              {l}
            </p>
          </div>
        ))}
      </div>

      {/* Year in Review: month-by-month chart */}
      {isYear && (
        <div className="rounded-2xl bg-card border border-border/60 p-4">
          <p className="text-xs uppercase tracking-widest font-display font-bold text-muted-foreground mb-3">
            Workouts by month
          </p>
          <div
            className="flex items-end gap-1 h-28"
            role="img"
            aria-label={`Workouts by month: ${stats.perMonth.map((n, i) => `${MONTH_NAMES[i]} ${n}`).join(", ")}`}
          >
            {stats.perMonth.map((n, i) => {
              const max = Math.max(1, ...stats.perMonth);
              return (
                <div key={MONTH_NAMES[i]} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md"
                    style={{
                      height: `${Math.max(4, (n / max) * 88)}px`,
                      background:
                        n === max && n > 0 ? "oklch(var(--prestige))" : "oklch(var(--primary) / 0.45)",
                    }}
                  />
                  <span className="text-[9px] text-muted-foreground font-body">
                    {MONTH_NAMES[i]!.charAt(0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Highlights */}
      <div className="rounded-2xl bg-card border border-border/60 p-4 flex flex-col gap-3">
        <p className="text-xs uppercase tracking-widest font-display font-bold text-muted-foreground">
          Highlights
        </p>
        {isYear && stats.bestMonth && <Highlight icon="🏆" label="Best month" value={stats.bestMonth} />}
        {stats.topDeck && <Highlight icon="🃏" label="Favourite deck" value={stats.topDeck} />}
        {stats.longestDayRun > 1 && (
          <Highlight icon="🔥" label="Longest run" value={`${stats.longestDayRun} days in a row`} />
        )}
        {stats.busiestWeekday && <Highlight icon="📅" label="Go-to day" value={stats.busiestWeekday} />}
        {stats.favoriteTime && <Highlight icon="⏰" label="You train in the" value={stats.favoriteTime} />}
        {stats.achievements > 0 && (
          <Highlight icon="🏅" label="Achievements unlocked" value={String(stats.achievements)} />
        )}
        {isYear && (
          <>
            <Highlight icon="💪" label="Different exercises" value={String(stats.exercisesTried)} />
            {stats.proSessions > 0 && (
              <Highlight icon="⚡" label="Pro deck workouts" value={String(stats.proSessions)} />
            )}
            {stats.fullDeckSessions > 0 && (
              <Highlight icon="♠" label="Full 52-card gauntlets" value={String(stats.fullDeckSessions)} />
            )}
          </>
        )}
      </div>

      {stats.topExercises.length > 0 && (
        <div className="rounded-2xl bg-card border border-border/60 p-4">
          <p className="text-xs uppercase tracking-widest font-display font-bold text-muted-foreground mb-2">
            Most-drawn exercises
          </p>
          <ol className="flex flex-col gap-2">
            {stats.topExercises.map((e, i) => (
              <li key={e.name} className="flex items-center justify-between text-sm font-body">
                <span className="text-foreground">
                  {["🥇", "🥈", "🥉"][i]} {e.name}
                </span>
                <span className="text-muted-foreground">
                  {e.sessions} workout{e.sessions === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </motion.div>
  );
}

function Highlight({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm font-body">
      <span className="text-muted-foreground">
        <span aria-hidden="true">{icon}</span> {label}
      </span>
      <span className="font-display font-bold text-foreground">{value}</span>
    </div>
  );
}
