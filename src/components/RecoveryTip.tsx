import { Moon } from "lucide-react";

/** Small caption row, not a card — sits beneath a recommendation to explain why it changed. Never shown unless the recovery logic actually swapped something. */
export function RecoveryTip({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-1.5 px-1 mt-2" data-ocid="home.recovery_tip">
      <Moon className="w-3 h-3 shrink-0" style={{ color: "#1AD6A0" }} aria-hidden="true" />
      <p
        className="text-[11px] font-body leading-snug"
        style={{ color: "oklch(0.55 0.008 260)" }}
      >
        {text}
      </p>
    </div>
  );
}
