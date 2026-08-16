import { getSuggestionsForExercise } from "@/data/equipmentMapping";
import type { Direction, EquipmentTier } from "@/types/equipment";

const DIRECTION_STYLE: Record<Direction, { color: string; icon: string }> = {
  easier: { color: "#1AD6A0", icon: "↓" },
  harder: { color: "#f97316", icon: "↑" },
  enables: { color: "#a3a3a3", icon: "⊕" },
};

interface EquipmentSuggestionChipsProps {
  exerciseName: string;
  tier: EquipmentTier;
  className?: string;
}

/**
 * Small, informational chips suggesting easier/harder equipment variants
 * for the current card's exercise — suggestions only, never changes the
 * card's actual exercise, reps, or workout logic. Renders nothing for the
 * "bodyweight" tier (no equipment to suggest) or when the exercise has no
 * mapping (high-impact/cardio/skill/combo work, see equipmentMapping.ts).
 */
export function EquipmentSuggestionChips({
  exerciseName,
  tier,
  className,
}: EquipmentSuggestionChipsProps) {
  if (tier === "bodyweight") return null;
  const suggestions = getSuggestionsForExercise(exerciseName, tier);
  if (suggestions.length === 0) return null;

  return (
    <div
      className={`flex flex-col items-start gap-1.5 w-full max-w-full overflow-x-auto ${className ?? ""}`}
      data-ocid="equipment-suggestion-chips"
    >
      {suggestions.map((suggestion, i) => {
        const style = DIRECTION_STYLE[suggestion.direction];
        return (
          <div
            key={`${suggestion.equipment}-${suggestion.direction}`}
            className="inline-flex items-center gap-1.5 max-w-full rounded-full px-3 py-1.5 shrink-0"
            style={{
              background: "transparent",
              border: `1px solid ${style.color}`,
            }}
            data-ocid={`equipment-suggestion-chips.chip.${i + 1}`}
          >
            <span
              aria-hidden="true"
              className="shrink-0 leading-none"
              style={{ fontSize: "12px", color: style.color }}
            >
              {style.icon}
            </span>
            <span
              className="truncate font-body leading-tight"
              style={{ fontSize: "13px", color: style.color }}
            >
              {suggestion.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
