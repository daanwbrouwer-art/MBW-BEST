import { Logo } from "@/components/Logo";
import { PaywallModal } from "@/components/PaywallModal";
import { useTier } from "@/hooks/use-tier";
import { useCustomWorkoutStore } from "@/store/customWorkout";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Crown, Layers, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

/** Landing screen for the Custom Workout feature — a list of every saved
 * deck, replacing the old direct-to-picker link from Home. The picker
 * (CustomWorkoutBuilderPage.tsx) is reached from here via "+ New Deck" or by
 * editing an existing deck from its detail screen. */
export default function CustomDecksPage() {
  const navigate = useNavigate();
  const { effectiveTier, isLoading: tierLoading } = useTier();
  const isPremium = effectiveTier === "subscriber";
  const { decks } = useCustomWorkoutStore();

  const [showPaywall, setShowPaywall] = useState(false);

  const handleNewDeck = () => {
    if (tierLoading) return;
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }
    navigate({ to: "/custom-workout/new" });
  };

  const handleOpenDeck = (deckId: string) => {
    navigate({ to: "/custom-workout/deck/$deckId", params: { deckId } });
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto relative">
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
          data-ocid="custom-decks.back_button"
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
          My Custom Decks
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
          Your saved exercise lists — build as many as you want.
        </p>
      </div>

      <div className="relative flex-1 overflow-y-auto px-5 pt-3 pb-4">
        <button
          type="button"
          onClick={handleNewDeck}
          className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 mb-4 font-display font-bold text-sm tracking-wide uppercase transition-smooth hover:opacity-90 active:scale-[0.98]"
          style={{
            border: "1.5px dashed oklch(0.68 0.25 180 / 0.5)",
            color: "oklch(0.68 0.25 180)",
          }}
          data-ocid="custom-decks.new_deck_button"
        >
          <Plus className="w-4 h-4" />
          New Deck
        </button>

        {tierLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="rounded-2xl h-16 animate-pulse"
                style={{
                  background: "oklch(0.16 0.01 260)",
                  border: "1px solid oklch(0.24 0.01 260 / 0.5)",
                }}
                data-ocid={`custom-decks.skeleton.${i + 1}`}
              />
            ))}
          </div>
        ) : decks.length === 0 ? (
          <div
            className="rounded-2xl px-5 py-10 text-center"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.4)",
            }}
            data-ocid="custom-decks.empty_state"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "oklch(0.68 0.25 180 / 0.1)" }}
            >
              <Layers
                className="w-7 h-7"
                style={{ color: "oklch(0.68 0.25 180 / 0.5)" }}
              />
            </div>
            <p className="font-display font-bold text-sm text-foreground mb-1">
              No custom decks yet
            </p>
            <p className="text-xs text-muted-foreground font-body">
              Tap "New Deck" to pick your own exercises and save them for later.
            </p>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.5)",
            }}
          >
            {decks.map((deck, i) => (
              <button
                key={deck.id}
                type="button"
                onClick={() => handleOpenDeck(deck.id)}
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left transition-smooth hover:opacity-80"
                style={{
                  borderBottom:
                    i < decks.length - 1
                      ? "1px solid oklch(0.22 0.01 260 / 0.5)"
                      : "none",
                }}
                data-ocid={`custom-decks.item.${i + 1}`}
              >
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm text-foreground truncate">
                    {deck.name}
                  </p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">
                    {deck.exercises.length}{" "}
                    {deck.exercises.length === 1 ? "exercise" : "exercises"}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPaywall && (
          <PaywallModal onDismiss={() => setShowPaywall(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
