import { Logo } from "@/components/Logo";
import { PaywallModal } from "@/components/PaywallModal";
import { Button } from "@/components/ui/button";
import { resolveExerciseIllustration } from "@/data/exerciseAssets";
import {
  type BodyRegion,
  type CatalogExercise,
  EXERCISE_CATALOG,
} from "@/data/exerciseCatalog";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useTier } from "@/hooks/use-tier";
import { cn } from "@/lib/utils";
import {
  type CustomWorkoutExercise,
  useCustomWorkoutStore,
} from "@/store/customWorkout";
import { DECK_CATEGORY_ICON } from "@/types/workout";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Crown,
  Minus,
  Plus,
  Search,
  Timer,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

// bodyRegion is the precise per-exercise classification (what the movement
// actually trains — see exerciseCatalog.ts), which is why it can tag
// exercises as Core even though the Core *deck* itself is locked.
const FILTER_OPTIONS: Array<{ key: BodyRegion | "All"; label: string }> = [
  { key: "All", label: "All" },
  { key: "UpperBody", label: "Upper Body" },
  { key: "LowerBody", label: "Lower Body" },
  { key: "Core", label: "Core" },
];

const BODY_REGION_LABEL: Record<BodyRegion, string> = {
  UpperBody: "Upper Body",
  LowerBody: "Lower Body",
  Core: "Core",
};

export default function CustomWorkoutBuilderPage() {
  const navigate = useNavigate();
  const { gender } = useOnboarding();
  const { effectiveTier } = useTier();
  const isPremium = effectiveTier === "subscriber";

  const { selected, isSelected, addExercise, removeExercise, setValue } =
    useCustomWorkoutStore();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<BodyRegion | "All">("All");
  const [showPaywall, setShowPaywall] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return EXERCISE_CATALOG.filter((ex) => {
      if (filter !== "All" && ex.bodyRegion !== filter) return false;
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, filter]);

  // Grouped into Upper Body / Lower Body / Core sections when browsing
  // "All" (unfiltered); a single filter selection already narrows to one
  // region, so grouping would be redundant there.
  const grouped = useMemo(() => {
    if (filter !== "All") return null;
    const groups: Record<BodyRegion, CatalogExercise[]> = {
      UpperBody: [],
      LowerBody: [],
      Core: [],
    };
    for (const ex of filtered) groups[ex.bodyRegion].push(ex);
    return groups;
  }, [filtered, filter]);

  const handleToggle = (ex: CatalogExercise) => {
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }
    if (isSelected(ex.name)) {
      removeExercise(ex.name);
      return;
    }
    const exercise: CustomWorkoutExercise = {
      name: ex.name,
      isIsometric: ex.isIsometric,
      value: ex.isIsometric
        ? (ex.defaultHoldSeconds ?? 20)
        : (ex.defaultReps ?? 10),
      eachSide: ex.eachSide,
    };
    addExercise(exercise);
  };

  const handleStart = () => {
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }
    if (selected.length === 0) return;
    navigate({ to: "/custom-workout/session" });
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto relative">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 max-w-[430px] mx-auto"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.22 0.04 180 / 0.2) 0%, transparent 65%)",
        }}
      />

      <header className="relative flex items-center gap-3 px-5 pt-12 pb-3">
        <motion.button
          type="button"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate({ to: "/home" })}
          className="w-10 h-10 rounded-xl bg-card border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/45 transition-smooth shrink-0"
          data-ocid="custom-workout.back_button"
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>
        <Logo size="sm" iconOnly className="opacity-70" />
      </header>

      <div className="relative px-5 pb-2">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display font-black text-2xl text-foreground leading-tight"
        >
          Build Your Own
        </motion.h1>
        <div className="flex items-center gap-1.5 mt-1">
          <Crown
            className="w-3.5 h-3.5"
            style={{ color: "oklch(0.76 0.22 60)" }}
          />
          <p
            className="text-[11px] font-display font-bold uppercase tracking-widest"
            style={{ color: "oklch(0.76 0.22 60)" }}
          >
            Premium Feature
          </p>
        </div>
        <p className="text-sm text-muted-foreground font-body mt-1.5">
          Pick any exercises from the app and train them in your own order.
        </p>
      </div>

      {/* Search */}
      <div className="relative px-5 pt-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="w-full h-11 rounded-xl bg-card border border-border/50 pl-10 pr-9 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-smooth"
            data-ocid="custom-workout.search_input"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category filter chips */}
      <div className="relative px-5 pt-3 pb-1 flex gap-2 overflow-x-auto no-scrollbar">
        {FILTER_OPTIONS.map((opt) => {
          const active = filter === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilter(opt.key)}
              className={cn(
                "shrink-0 px-3.5 h-8 rounded-full text-xs font-display font-bold uppercase tracking-wide transition-smooth border",
                active
                  ? "bg-primary text-background border-primary"
                  : "bg-card text-muted-foreground border-border/50 hover:text-foreground",
              )}
              data-ocid={`custom-workout.filter.${opt.key}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Exercise grid — grouped into Upper Body / Lower Body / Core
          sections when browsing everything, flat grid once a single
          region filter narrows things down. */}
      <div className="relative flex-1 overflow-y-auto px-5 pt-3 pb-4">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground font-body py-10">
            No exercises match your search.
          </p>
        ) : grouped ? (
          <div className="flex flex-col gap-5">
            {(Object.keys(BODY_REGION_LABEL) as BodyRegion[]).map((region) => {
              const items = grouped[region];
              if (items.length === 0) return null;
              return (
                <div key={region}>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className="text-sm">
                      {DECK_CATEGORY_ICON[region]}
                    </span>
                    <p className="text-xs font-display font-bold uppercase tracking-widest text-muted-foreground">
                      {BODY_REGION_LABEL[region]}
                    </p>
                    <span className="text-[10px] text-muted-foreground/60 font-body">
                      {items.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {items.map((ex) => (
                      <ExerciseCatalogCard
                        key={ex.name}
                        exercise={ex}
                        gender={gender}
                        isPremium={isPremium}
                        picked={isSelected(ex.name)}
                        onToggle={() => handleToggle(ex)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((ex) => (
              <ExerciseCatalogCard
                key={ex.name}
                exercise={ex}
                gender={gender}
                isPremium={isPremium}
                picked={isSelected(ex.name)}
                onToggle={() => handleToggle(ex)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected exercises strip + start button */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative border-t border-border/50 bg-background/95 backdrop-blur-sm px-5 pt-3 pb-6"
          >
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
              {selected.map((ex) => (
                <div
                  key={ex.name}
                  className="shrink-0 flex items-center gap-2 rounded-xl pl-3 pr-2 h-10 bg-card border border-border/50"
                >
                  <span className="text-[11px] font-body text-foreground max-w-[90px] truncate">
                    {ex.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setValue(ex.name, ex.value - (ex.isIsometric ? 5 : 1))
                      }
                      className="w-5 h-5 rounded-md flex items-center justify-center bg-muted/40 text-muted-foreground hover:text-foreground"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="text-[11px] font-display font-bold text-primary tabular-nums w-9 text-center">
                      {ex.value}
                      {ex.isIsometric ? "s" : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setValue(ex.name, ex.value + (ex.isIsometric ? 5 : 1))
                      }
                      className="w-5 h-5 rounded-md flex items-center justify-center bg-muted/40 text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExercise(ex.name)}
                    className="text-muted-foreground hover:text-destructive ml-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <Button
              className="w-full h-14 font-display font-black text-base tracking-[0.1em] rounded-2xl uppercase shadow-[0_0_40px_oklch(0.68_0.25_180/0.35)]"
              onClick={handleStart}
              data-ocid="custom-workout.start_button"
            >
              Start Workout — {selected.length}{" "}
              {selected.length === 1 ? "exercise" : "exercises"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPaywall && (
          <PaywallModal onDismiss={() => setShowPaywall(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Exercise Catalog Card ─────────────────────────────────────────────────

function ExerciseCatalogCard({
  exercise,
  gender,
  isPremium,
  picked,
  onToggle,
}: {
  exercise: CatalogExercise;
  gender: "male" | "female";
  isPremium: boolean;
  picked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "relative rounded-2xl border overflow-hidden text-left bg-card transition-smooth",
        picked
          ? "border-primary shadow-[0_0_20px_oklch(0.68_0.25_180/0.25)]"
          : "border-border/50 hover:border-primary/40",
      )}
      data-ocid={`custom-workout.exercise_card.${exercise.name}`}
    >
      <div
        className="relative w-full aspect-square overflow-hidden"
        style={{ background: "oklch(0.16 0.01 260)" }}
      >
        <img
          src={resolveExerciseIllustration(exercise.name, gender)}
          alt={exercise.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {!isPremium && (
          <div
            className="absolute inset-0"
            style={{ background: "oklch(0.05 0.005 260 / 0.35)" }}
          />
        )}
        {exercise.isIsometric && (
          <span
            className="absolute top-1.5 left-1.5 flex items-center gap-0.5 text-[8px] font-display font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            style={{
              background: "oklch(0.68 0.25 180 / 0.85)",
              color: "oklch(0.05 0.005 260)",
            }}
          >
            <Timer className="w-2 h-2" /> Hold
          </span>
        )}
        {picked && (
          <div
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "oklch(0.68 0.25 180)" }}
          >
            <Check className="w-3 h-3 text-background" strokeWidth={3} />
          </div>
        )}
      </div>
      <div className="px-2.5 py-2">
        <p className="text-[11px] font-display font-bold text-foreground leading-tight line-clamp-2">
          {exercise.name}
        </p>
        <p className="text-[9px] text-muted-foreground font-body mt-0.5 uppercase tracking-wide">
          {DECK_CATEGORY_ICON[exercise.bodyRegion]}{" "}
          {exercise.isIsometric
            ? `${exercise.defaultHoldSeconds ?? 20}s`
            : `${exercise.defaultReps ?? 10} reps`}
        </p>
      </div>
    </button>
  );
}
