import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Flame } from "lucide-react";

interface WorkoutStatsProps {
  elapsed: string;
  calories: number;
  completedCards: number;
  totalCards: number;
  className?: string;
}

export function WorkoutStats({
  elapsed,
  calories,
  completedCards,
  totalCards,
  className,
}: WorkoutStatsProps) {
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      data-ocid="workout-stats"
    >
      <StatPill
        icon={<Clock className="w-3.5 h-3.5" />}
        value={elapsed}
        label="Time"
        glowColor="oklch(0.68 0.25 180 / 0.25)"
      />
      <StatPill
        icon={<Flame className="w-3.5 h-3.5" />}
        value={String(calories)}
        label="kcal"
        accent="amber"
        glowColor="oklch(0.83 0.19 84 / 0.3)"
      />
      <StatPill
        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
        value={`${completedCards}/${totalCards}`}
        label="Done"
        accent="green"
        glowColor="oklch(0.72 0.19 145 / 0.25)"
      />
    </div>
  );
}

interface StatPillProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent?: "amber" | "green" | "cyan";
  glowColor?: string;
}

const ACCENT_ICON_COLOR: Record<string, string> = {
  amber: "oklch(0.83 0.19 84)",
  green: "oklch(0.72 0.19 145)",
  cyan: "oklch(0.68 0.25 180)",
};

function StatPill({ icon, value, label, accent, glowColor }: StatPillProps) {
  const iconColor = accent
    ? ACCENT_ICON_COLOR[accent]
    : "oklch(0.55 0.008 260)";

  return (
    <div
      className="flex flex-1 items-center gap-2 rounded-2xl px-3 py-2.5 border backdrop-blur-sm"
      style={{
        background: "oklch(0.16 0.01 260 / 0.85)",
        borderColor: glowColor
          ? glowColor.replace("0.25)", "0.25)").replace("0.3)", "0.3)")
          : "oklch(0.26 0.01 260)",
        boxShadow: glowColor ? `0 0 16px ${glowColor}` : undefined,
      }}
    >
      <span className="shrink-0" style={{ color: iconColor }}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="font-display font-bold text-sm text-foreground leading-none tabular-nums">
          {value}
        </div>
        <div className="text-xs text-muted-foreground font-body mt-0.5 uppercase tracking-wider">
          {label}
        </div>
      </div>
    </div>
  );
}
