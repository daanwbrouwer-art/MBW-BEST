import { Logo } from "@/components/Logo";
import { useOnboarding } from "@/hooks/use-onboarding";
import { countProDeckPlays } from "@/hooks/use-trial";
import {
  EQUIPMENT_LABEL,
  type ProPreviewExercise,
  buildProDeckExercises,
  pickFlagshipExercises,
} from "@/lib/proDeckPreview";
import { resolveExerciseIllustration } from "@/data/exerciseAssets";
import { hasEverHadTrial, isWithinPostTrialNudgeWindow } from "@/lib/trial";
import { useWorkoutStore } from "@/store/workout";
import {
  DECK_CATEGORY_LABEL,
  DECK_DIFFICULTY_LABEL,
  SUIT_COLOR,
  SUIT_SYMBOL,
} from "@/types/workout";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";

function suitAccent(suit: string): string {
  const color = SUIT_COLOR[suit];
  if (color === "red") return "oklch(0.65 0.22 25)";
  if (color === "joker") return "oklch(0.68 0.25 180)";
  return "oklch(0.85 0.005 260)";
}

function repLabel(ex: ProPreviewExercise): string {
  if (ex.isChallenge) return "Challenge";
  if (ex.minReps === ex.maxReps) return `${ex.minReps} reps`;
  return `${ex.minReps}–${ex.maxReps} reps`;
}

export default function ProDeckPreviewPage() {
  const navigate = useNavigate();
  const { selectedCategory } = useWorkoutStore();
  const { gender } = useOnboarding();

  const category = selectedCategory ?? "UpperBody";

  const exercises = useMemo(
    () => buildProDeckExercises(category, gender),
    [category, gender],
  );
  const flagship = useMemo(() => pickFlagshipExercises(exercises), [exercises]);

  const deckTitle = `${DECK_DIFFICULTY_LABEL.Pro} ${DECK_CATEGORY_LABEL[category]}`;

  const showTrialNudge = hasEverHadTrial() && isWithinPostTrialNudgeWindow();
  const priorPlays = showTrialNudge ? countProDeckPlays(deckTitle) : 0;

  const handleSubscribe = () => {
    navigate({ to: "/subscribe" });
  };

  return (
    <div
      className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto"
      data-ocid="pro-preview.page"
    >
      <div
        className="pointer-events-none fixed inset-0 max-w-[430px] mx-auto"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.22 0.04 180 / 0.2) 0%, transparent 65%)",
        }}
      />

      <header className="relative flex items-center gap-3 px-5 pt-12 pb-4">
        <motion.button
          type="button"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate({ to: "/decks" })}
          className="w-10 h-10 rounded-xl bg-card border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/45 transition-smooth shrink-0"
          data-ocid="pro-preview.back_button"
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>
        <Logo size="sm" iconOnly className="opacity-70" />
      </header>

      <div className="relative flex-1 px-5 pb-10 overflow-y-auto">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <span
            className="inline-block text-[10px] font-display font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-2"
            style={{
              background: "oklch(0.68 0.25 180 / 0.15)",
              color: "oklch(0.68 0.25 180)",
              border: "1px solid oklch(0.68 0.25 180 / 0.3)",
            }}
          >
            🔒 Subscriber only
          </span>
          <h1 className="font-display font-black text-2xl text-foreground leading-tight">
            {deckTitle}
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1.5 leading-relaxed">
            The most demanding bodyweight exercises in a single deck.
          </p>
        </motion.div>

        {priorPlays > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="rounded-2xl px-4 py-3 mb-6"
            style={{
              background: "oklch(0.17 0.04 180 / 0.3)",
              border: "1px solid oklch(0.68 0.25 180 / 0.3)",
            }}
            data-ocid="pro-preview.trial_nudge"
          >
            <p className="text-sm text-foreground font-body leading-snug">
              You trained {deckTitle} {priorPlays}{" "}
              {priorPlays === 1 ? "time" : "times"} during your trial. Pick
              up where you left off →
            </p>
          </motion.div>
        )}

        {/* Highlight — flagship exercises */}
        {flagship.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mb-7"
          >
            <p className="text-xs font-display font-bold uppercase tracking-widest text-muted-foreground mb-3">
              What makes this deck Pro
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5 snap-x snap-mandatory">
              {flagship.map((ex) => (
                <FlagshipCard key={ex.name} exercise={ex} gender={gender} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Full exercise list */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="mb-8"
        >
          <p className="text-xs font-display font-bold uppercase tracking-widest text-muted-foreground mb-3">
            All exercises ({exercises.length})
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.5)",
            }}
          >
            {exercises.map((ex, i) => (
              <div
                key={ex.name}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom:
                    i < exercises.length - 1
                      ? "1px solid oklch(0.22 0.01 260 / 0.5)"
                      : "none",
                }}
                data-ocid={`pro-preview.exercise.${i + 1}`}
              >
                <div
                  className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ background: "oklch(0.98 0.005 70)" }}
                >
                  {ex.illustrationComingSoon ? (
                    <Dumbbell
                      className="w-4 h-4"
                      style={{ color: "oklch(0.7 0.01 260)" }}
                    />
                  ) : (
                    <img
                      src={ex.imagePath || resolveExerciseIllustration(ex.name, gender)}
                      alt=""
                      className="w-full h-full object-contain p-0.5"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.visibility =
                          "hidden";
                      }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm text-foreground truncate">
                    {ex.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-xs font-body"
                      style={{
                        color: ex.isChallenge
                          ? "oklch(0.68 0.25 180)"
                          : "oklch(0.6 0.01 260)",
                      }}
                    >
                      {repLabel(ex)}
                    </span>
                    {ex.requiresEquipment && (
                      <span
                        className="flex items-center gap-1 text-[10px] font-body px-1.5 py-0.5 rounded-full shrink-0"
                        style={{
                          background: "oklch(0.68 0.25 180 / 0.1)",
                          color: "oklch(0.68 0.25 180)",
                          border: "1px solid oklch(0.68 0.25 180 / 0.25)",
                        }}
                        data-ocid={`pro-preview.exercise.${i + 1}.equipment_badge`}
                      >
                        <Dumbbell className="w-2.5 h-2.5" />
                        {EQUIPMENT_LABEL[ex.requiresEquipment]}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className="text-base shrink-0"
                  style={{ color: suitAccent(ex.suit) }}
                  aria-hidden="true"
                >
                  {SUIT_SYMBOL[ex.suit] ?? "•"}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-5 text-center"
          style={{
            background: "oklch(0.17 0.04 180 / 0.35)",
            border: "1px solid oklch(0.68 0.25 180 / 0.3)",
          }}
        >
          <h2 className="font-display font-black text-lg text-foreground mb-1">
            Ready for the challenge?
          </h2>
          <p className="text-sm text-muted-foreground font-body mb-5">
            Unlock all Pro decks with a subscription
          </p>
          <button
            type="button"
            onClick={handleSubscribe}
            className="w-full h-14 rounded-full flex items-center justify-center font-display font-bold text-sm tracking-wide bg-primary text-background transition-smooth hover:opacity-90 active:scale-[0.98] mb-3"
            data-ocid="pro-preview.subscribe_button"
          >
            Subscribe
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/decks" })}
            className="text-xs text-muted-foreground hover:text-foreground transition-smooth"
            data-ocid="pro-preview.dismiss_link"
          >
            Not yet — keep training
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function FlagshipCard({
  exercise,
  gender,
}: {
  exercise: ReturnType<typeof pickFlagshipExercises>[number];
  gender: "male" | "female";
}) {
  return (
    <div
      className="shrink-0 w-[150px] rounded-2xl overflow-hidden snap-start flex flex-col"
      style={{
        background: "oklch(0.13 0.005 260)",
        border: "1px solid oklch(0.68 0.25 180 / 0.3)",
        boxShadow:
          "0 0 20px oklch(0.68 0.25 180 / 0.15), 0 8px 24px oklch(0 0 0 / 0.5)",
      }}
      data-ocid="pro-preview.flagship_card"
    >
      <div
        className="m-2.5 mb-0 rounded-xl overflow-hidden flex items-center justify-center"
        style={{ background: "oklch(0.98 0.005 70)", aspectRatio: "1/1" }}
      >
        {exercise.illustrationComingSoon ? (
          <div className="flex flex-col items-center gap-1 px-2 text-center">
            <Dumbbell className="w-5 h-5" style={{ color: "oklch(0.6 0.01 260)" }} />
            <span
              className="text-[8px] font-bold uppercase tracking-wide"
              style={{ color: "oklch(0.5 0.01 260)" }}
            >
              Coming soon
            </span>
          </div>
        ) : (
          <img
            src={
              exercise.imagePath || resolveExerciseIllustration(exercise.name, gender)
            }
            alt=""
            className="w-full h-full object-contain p-2"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />
        )}
      </div>
      <div className="p-2.5 flex flex-col gap-1 flex-1">
        <p className="font-display font-black text-xs text-white leading-tight">
          {exercise.name}
        </p>
        <p
          className="font-display font-bold text-[11px]"
          style={{ color: "oklch(0.68 0.25 180)" }}
        >
          {repLabel(exercise)}
        </p>
        <p className="text-[10px] text-muted-foreground font-body leading-snug">
          {exercise.description}
        </p>
      </div>
    </div>
  );
}
