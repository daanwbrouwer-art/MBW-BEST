export function WeeklyGoalPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-2" data-ocid="weekly-goal-picker.root">
      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`flex-1 aspect-square rounded-xl flex items-center justify-center font-display font-black text-sm transition-all duration-200 ${
            value === n
              ? "bg-primary text-background shadow-[0_0_16px_oklch(0.68_0.25_180_/_0.4)]"
              : "bg-card border border-border text-muted-foreground hover:border-primary/40"
          }`}
          data-ocid={`weekly-goal-picker.option_${n}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
