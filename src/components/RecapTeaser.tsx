import { readAchievementUnlockTimes } from "@/lib/achievementEngine";
import { readSessions } from "@/lib/achievementSessionLog";
import { MONTH_NAMES, computeRecap, currentPeriod, previousPeriod } from "@/lib/recap";
import { useWorkoutStore } from "@/store/workout";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, ChevronRight } from "lucide-react";
import { useMemo } from "react";

/**
 * Home's pointer to the Monthly Recap / Year in Review. Early in a month it
 * announces last month's recap ("ready"); in early January last year's Year
 * in Review; otherwise it shows this month so far and says when the full
 * recap arrives, so people know it's theirs to look forward to.
 */
export function RecapTeaser() {
  const navigate = useNavigate();
  const guestMode = useWorkoutStore((s) => s.guestMode);
  const isGuest = guestMode && localStorage.getItem("mbw_user") === null;

  const view = useMemo(() => {
    const now = new Date();
    const sessions = readSessions(isGuest);
    const unlocks = readAchievementUnlockTimes(isGuest);
    const lastYear = previousPeriod(currentPeriod("year", now));
    const lastMonth = previousPeriod(currentPeriod("month", now));
    const thisMonth = currentPeriod("month", now);

    if (now.getMonth() === 0 && now.getDate() <= 14) {
      const y = computeRecap(sessions, unlocks, lastYear);
      if (y.workouts > 0)
        return {
          title: `Your ${lastYear.year} Year in Review is ready 🎉`,
          sub: `${y.workouts} workouts · ${y.reps.toLocaleString()} reps — see your best month and top exercises.`,
          href: `/recap?view=year&y=${lastYear.year}`,
          highlight: true,
        };
    }
    if (now.getDate() <= 7 && lastMonth.kind === "month") {
      const m = computeRecap(sessions, unlocks, lastMonth);
      if (m.workouts > 0)
        return {
          title: `Your ${MONTH_NAMES[lastMonth.month]} recap is ready 🎉`,
          sub: `${m.workouts} workouts · ${m.reps.toLocaleString()} reps · ${m.trainingDays} training days`,
          href: `/recap?view=month&y=${lastMonth.year}&m=${lastMonth.month}`,
          highlight: true,
        };
    }
    const m = computeRecap(sessions, unlocks, thisMonth);
    const monthName = thisMonth.kind === "month" ? MONTH_NAMES[thisMonth.month] : "";
    return {
      title: "Monthly Recap",
      sub:
        m.workouts > 0
          ? `${monthName} so far: ${m.workouts} workout${m.workouts === 1 ? "" : "s"} · ${m.reps.toLocaleString()} reps. Your full recap lands on the 1st — plus a Year in Review every January.`
          : `Every month you get a recap of your training, and every January a Year in Review. ${monthName}'s starts with your first workout.`,
      href: "/recap",
      highlight: false,
    };
  }, [isGuest]);

  return (
    <button
      type="button"
      onClick={() => navigate({ href: view.href })}
      className="mt-3 w-full rounded-2xl border p-4 flex items-center gap-3 text-left transition-smooth active:scale-[0.99]"
      style={{
        background: view.highlight
          ? "linear-gradient(135deg, oklch(var(--prestige) / 0.22), oklch(var(--primary) / 0.12))"
          : "oklch(0.16 0.012 var(--neutral-hue))",
        borderColor: view.highlight ? "oklch(var(--prestige) / 0.5)" : "oklch(var(--primary) / 0.25)",
      }}
      data-ocid="home.recap_teaser"
    >
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "oklch(var(--primary) / 0.15)" }}
      >
        <CalendarDays className="w-5 h-5" style={{ color: "oklch(var(--primary))" }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display font-bold text-sm text-foreground">{view.title}</span>
        <span className="block text-xs text-muted-foreground font-body mt-0.5 leading-snug">
          {view.sub}
        </span>
      </span>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}
