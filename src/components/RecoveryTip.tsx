import { Moon } from "lucide-react";

/** Small caption row, not a card — sits beneath a recommendation to explain why it changed. Never shown unless the recovery logic actually swapped something. */
export function RecoveryTip({ text }: { text: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-1 mt-2"
      data-ocid="home.recovery_tip"
    >
      <Moon
        className="w-3 h-3 shrink-0"
        style={{ color: "oklch(var(--primary))" }}
        aria-hidden="true"
      />
      <p
        className="text-xs font-body leading-snug"
        style={{ color: "oklch(0.55 0.008 var(--neutral-hue))" }}
      >
        {text}
      </p>
    </div>
  );
}
