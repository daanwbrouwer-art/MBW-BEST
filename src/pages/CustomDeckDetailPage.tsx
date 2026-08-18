import { Logo } from "@/components/Logo";
import { PaywallModal } from "@/components/PaywallModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTier } from "@/hooks/use-tier";
import { useCustomWorkoutStore } from "@/store/customWorkout";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Timer, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

/** Read-only view of one saved deck — exercise list plus Start/Edit/Rename/
 * Delete. Reached by tapping a deck on CustomDecksPage.tsx. */
export default function CustomDeckDetailPage() {
  const navigate = useNavigate();
  const { deckId } = useParams({ strict: false }) as { deckId?: string };
  const { effectiveTier, isLoading: tierLoading } = useTier();
  const isPremium = effectiveTier === "subscriber";
  const { getDeck, renameDeck, deleteDeck } = useCustomWorkoutStore();

  const deck = deckId ? getDeck(deckId) : undefined;

  const [showPaywall, setShowPaywall] = useState(false);
  const [showRenamePrompt, setShowRenamePrompt] = useState(false);
  const [renameInput, setRenameInput] = useState("");

  // Deck no longer exists (deleted, or a stale/invalid link) — bounce to the list.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only deckId/deck identity should re-trigger this
  useEffect(() => {
    if (!deckId || !deck) {
      navigate({ to: "/custom-workout" });
    }
  }, [deckId, deck]);

  if (!deck) return null;

  const handleStart = () => {
    if (tierLoading) return;
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }
    navigate({
      to: "/custom-workout/session/$deckId",
      params: { deckId: deck.id },
    });
  };

  const handleEdit = () => {
    navigate({
      to: "/custom-workout/edit/$deckId",
      params: { deckId: deck.id },
    });
  };

  const handleOpenRename = () => {
    setRenameInput(deck.name);
    setShowRenamePrompt(true);
  };

  const handleConfirmRename = () => {
    const name = renameInput.trim();
    if (!name) return;
    renameDeck(deck.id, name);
    setShowRenamePrompt(false);
  };

  const handleDelete = () => {
    deleteDeck(deck.id);
    navigate({ to: "/custom-workout" });
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
          onClick={() => navigate({ to: "/custom-workout" })}
          className="w-10 h-10 rounded-xl bg-card border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/45 transition-smooth shrink-0"
          data-ocid="custom-deck-detail.back_button"
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>
        <Logo size="sm" iconOnly className="opacity-70" />
      </header>

      <div className="relative px-5 pb-2 flex items-start justify-between gap-3">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display font-black text-2xl text-foreground leading-tight min-w-0 truncate"
          data-ocid="custom-deck-detail.name"
        >
          {deck.name}
        </motion.h1>
        <button
          type="button"
          onClick={handleOpenRename}
          className="shrink-0 w-9 h-9 rounded-xl bg-card border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/45 transition-smooth mt-0.5"
          aria-label="Rename deck"
          data-ocid="custom-deck-detail.rename_button"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="relative px-5 text-sm text-muted-foreground font-body mb-4">
        {deck.exercises.length}{" "}
        {deck.exercises.length === 1 ? "exercise" : "exercises"}
      </p>

      <div className="relative flex-1 overflow-y-auto px-5 pb-4">
        {deck.exercises.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground font-body py-10">
            This deck has no exercises yet — tap Edit to add some.
          </p>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.5)",
            }}
          >
            {deck.exercises.map((ex, i) => (
              <div
                key={ex.name}
                className="flex items-center justify-between gap-3 px-5 py-3.5"
                style={{
                  borderBottom:
                    i < deck.exercises.length - 1
                      ? "1px solid oklch(0.22 0.01 260 / 0.5)"
                      : "none",
                }}
                data-ocid={`custom-deck-detail.exercise.${i + 1}`}
              >
                <div className="min-w-0 flex items-center gap-2">
                  {ex.isIsometric && (
                    <Timer className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                  <p className="font-display font-bold text-sm text-foreground truncate">
                    {ex.name}
                    {ex.eachSide && (
                      <span className="text-xs text-muted-foreground normal-case font-body">
                        {" "}
                        (each side)
                      </span>
                    )}
                  </p>
                </div>
                <span
                  className="shrink-0 font-display font-bold text-sm tabular-nums"
                  style={{ color: "oklch(0.68 0.25 180)" }}
                >
                  {ex.value}
                  {ex.isIsometric ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative px-5 pb-6 pt-2 flex flex-col gap-2">
        <Button
          className="w-full h-14 font-display font-black text-base tracking-[0.1em] rounded-2xl uppercase shadow-[0_0_40px_oklch(0.68_0.25_180/0.35)]"
          onClick={handleStart}
          disabled={deck.exercises.length === 0}
          data-ocid="custom-deck-detail.start_button"
        >
          Start Workout
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-11 font-display font-bold text-xs tracking-wide uppercase rounded-xl"
            onClick={handleEdit}
            data-ocid="custom-deck-detail.edit_button"
          >
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 h-11 font-display font-bold text-xs tracking-wide uppercase rounded-xl text-destructive hover:text-destructive"
                data-ocid="custom-deck-detail.delete_button"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{deck.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This can't be undone. The deck and its exercise list will be
                  permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <AnimatePresence>
        {showPaywall && (
          <PaywallModal onDismiss={() => setShowPaywall(false)} />
        )}
      </AnimatePresence>

      <Dialog open={showRenamePrompt} onOpenChange={setShowRenamePrompt}>
        <DialogContent data-ocid="custom-deck-detail.rename_dialog">
          <DialogHeader>
            <DialogTitle>Rename deck</DialogTitle>
          </DialogHeader>
          <Input
            value={renameInput}
            onChange={(e) => setRenameInput(e.target.value)}
            placeholder="e.g. Upper Body Blast"
            maxLength={40}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirmRename();
            }}
            data-ocid="custom-deck-detail.rename_dialog_input"
          />
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowRenamePrompt(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmRename}
              disabled={!renameInput.trim()}
              data-ocid="custom-deck-detail.rename_dialog_confirm"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
