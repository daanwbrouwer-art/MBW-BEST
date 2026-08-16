import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AchievementView } from "@/lib/achievementEngine";
import { CATEGORY_META, RARITY_CONFIG } from "@/types/achievements";
import { Lock } from "lucide-react";

const TEAL = "#1AD6A0";
const GOLD = "#f5c518";

function formatUnlockedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function AchievementDetailSheet({
  achievement,
  open,
  onOpenChange,
}: {
  achievement: AchievementView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!achievement) return null;
  const isSecret = achievement.hidden && !achievement.unlocked && !achievement.almostUnlocked;
  const rarity = RARITY_CONFIG[achievement.rarity];
  const emoji = CATEGORY_META[achievement.category].emoji;
  const isBinary = achievement.target === 1;
  const pct =
    achievement.target > 0
      ? Math.min(100, (achievement.progress / achievement.target) * 100)
      : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t max-w-[430px] mx-auto"
        style={{
          background: "oklch(0.12 0.01 260)",
          borderColor: "oklch(0.26 0.01 260 / 0.6)",
        }}
        data-ocid="achievement.detail_sheet"
      >
        {isSecret ? (
          <div className="flex flex-col items-center text-center gap-3 py-6 px-4">
            <span className="text-5xl leading-none" style={{ color: "oklch(0.4 0.01 260)" }}>
              ?
            </span>
            <SheetHeader className="items-center p-0 gap-2">
              <SheetTitle className="font-display font-black text-xl text-white">
                ???
              </SheetTitle>
              <SheetDescription
                className="font-body text-sm"
                style={{ color: "oklch(0.7 0.008 260)" }}
              >
                This achievement is a secret. Keep playing to discover it.
              </SheetDescription>
            </SheetHeader>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-3 py-6 px-4">
            <span className="text-5xl leading-none">{emoji}</span>
            <SheetHeader className="items-center p-0 gap-2">
              <SheetTitle className="font-display font-black text-xl text-white">
                {achievement.name}
              </SheetTitle>
              <SheetDescription
                className="font-body text-sm"
                style={{ color: "oklch(0.75 0.008 260)" }}
              >
                {achievement.description}
              </SheetDescription>
            </SheetHeader>

            <span
              className="text-[11px] font-display font-black uppercase tracking-wider px-3 py-1 rounded-full"
              style={{
                background: `${rarity.glowColor}20`,
                color: rarity.glowColor,
                border: `1px solid ${rarity.glowColor}40`,
              }}
            >
              {rarity.label}
              {achievement.hidden ? " · Secret" : ""}
            </span>

            {achievement.unlocked && achievement.unlockedAt && (
              <p className="font-body text-xs" style={{ color: TEAL }}>
                Unlocked {formatUnlockedDate(achievement.unlockedAt)}
              </p>
            )}

            {achievement.almostUnlocked && (
              <div className="flex items-center gap-2 mt-1">
                <Lock className="w-4 h-4" style={{ color: GOLD }} />
                <span className="font-display font-bold text-xs" style={{ color: GOLD }}>
                  Fully earned — subscribe to claim it
                </span>
              </div>
            )}

            {!achievement.unlocked && !achievement.almostUnlocked && !isBinary && (
              <div className="w-full flex flex-col gap-1.5 mt-1">
                <div
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{ background: "oklch(0.22 0.012 260)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: TEAL }}
                  />
                </div>
                <p className="font-body text-xs" style={{ color: "oklch(0.65 0.008 260)" }}>
                  {achievement.progress.toLocaleString("en-US")} /{" "}
                  {achievement.target.toLocaleString("en-US")}
                  {achievement.unitLabel ? ` ${achievement.unitLabel}` : ""}
                </p>
              </div>
            )}

            {!achievement.unlocked && !achievement.almostUnlocked && isBinary && (
              <div className="flex items-center gap-2 mt-1">
                <Lock className="w-4 h-4" style={{ color: "oklch(0.5 0.008 260)" }} />
                <span className="font-body text-xs" style={{ color: "oklch(0.6 0.008 260)" }}>
                  Not yet unlocked
                </span>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
