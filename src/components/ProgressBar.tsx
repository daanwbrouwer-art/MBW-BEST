import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  className?: string;
}

export function ProgressBar({
  current,
  total,
  label,
  className,
}: ProgressBarProps) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const remaining = total - current;
  const showSegments = total <= 20 && total > 0;

  return (
    <div className={cn("w-full", className)} data-ocid="progress-bar">
      {label !== undefined && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-display font-bold text-muted-foreground uppercase tracking-[0.15em]">
            {label}
          </span>
          <span className="text-xs font-display font-bold">
            <span style={{ color: "oklch(0.68 0.25 180)" }}>{remaining}</span>
            <span className="text-muted-foreground font-normal"> left</span>
          </span>
        </div>
      )}

      {showSegments ? (
        // Segment dots — one per card with glow on active
        <div className="flex gap-1">
          {(Array.from({ length: total }, (_, i) => i + 1) as number[]).map(
            (seg) => {
              const isComplete = seg <= current;
              const isCurrent = seg === current;
              return (
                <motion.div
                  key={seg}
                  className={cn(
                    "flex-1 h-1.5 rounded-full",
                    !isComplete && "bg-muted/40",
                  )}
                  animate={{
                    backgroundColor: isComplete
                      ? "oklch(0.68 0.25 180)"
                      : "oklch(0.22 0.01 260)",
                  }}
                  transition={{ duration: 0.4 }}
                  style={{
                    boxShadow: isCurrent
                      ? "0 0 8px oklch(0.68 0.25 180 / 0.9), 0 0 20px oklch(0.68 0.25 180 / 0.4)"
                      : undefined,
                  }}
                />
              );
            },
          )}
        </div>
      ) : (
        // Continuous bar for 52-card decks
        <div
          className="relative h-2 rounded-full overflow-hidden"
          style={{ background: "oklch(0.22 0.01 260)" }}
        >
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              background:
                "linear-gradient(90deg, oklch(0.55 0.2 180) 0%, oklch(0.72 0.28 180) 100%)",
              boxShadow:
                "0 0 12px oklch(0.68 0.25 180 / 0.7), 0 0 24px oklch(0.68 0.25 180 / 0.3)",
            }}
          />
          {/* Shimmer overlay */}
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full pointer-events-none"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, oklch(1 0 0 / 0.15) 50%, transparent 100%)",
            }}
          />
        </div>
      )}
    </div>
  );
}
