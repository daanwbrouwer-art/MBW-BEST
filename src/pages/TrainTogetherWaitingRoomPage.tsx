import { Logo } from "@/components/Logo";
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
import { EXERCISE_CATALOG } from "@/data/exerciseCatalog";
import { supabase } from "@/lib/supabaseClient";
import {
  getTrainTogetherSession,
  listSessionParticipants,
  setParticipantReady,
  startTrainTogetherSession,
  subscribeToSession,
  subscribeToSessionParticipants,
  updatePartySetup,
} from "@/lib/trainTogetherBackend";
import {
  MAX_CARD_COUNT,
  MIN_CARD_COUNT,
  STANDARD_CARD_COUNT,
  type TrainTogetherCategory,
  availablePoolSize,
} from "@/lib/trainTogetherDraw";
import { cn } from "@/lib/utils";
import { DECK_CATEGORY_ICON, DECK_CATEGORY_LABEL } from "@/types/workout";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Check, Copy, Share2, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const DECK_CHOICES: TrainTogetherCategory[] = [
  "UpperBody",
  "LowerBody",
  "FullBody",
  "Core",
];
const CARD_COUNT_PRESETS = [MIN_CARD_COUNT, STANDARD_CARD_COUNT] as const;

async function shareInviteCode(code: string): Promise<void> {
  const text = `Join me on MyBodyWeight — Train Together with code ${code}`;
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch {
      // Fall through to clipboard if the share sheet was dismissed/unsupported.
    }
  }
  try {
    await navigator.clipboard.writeText(code);
    toast("Invite code copied", { description: code });
  } catch {
    toast("Couldn't share", { description: code });
  }
}

// ─── Workout setup sheet (host only) ───────────────────────────────────────

function WorkoutSetupSheet({
  sessionId,
  initialCategory,
  initialCardCount,
  initialExcluded,
  onClose,
  onSaved,
}: {
  sessionId: string;
  initialCategory: TrainTogetherCategory;
  initialCardCount: number;
  initialExcluded: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [category, setCategory] =
    useState<TrainTogetherCategory>(initialCategory);
  const [cardCount, setCardCount] = useState(initialCardCount);
  const [useCustomCount, setUseCustomCount] = useState(
    !CARD_COUNT_PRESETS.includes(
      initialCardCount as (typeof CARD_COUNT_PRESETS)[number],
    ),
  );
  const [excluded, setExcluded] = useState<Set<string>>(
    new Set(initialExcluded),
  );

  const pool = EXERCISE_CATALOG.filter(
    (ex) => category === "FullBody" || ex.categories.includes(category),
  );
  const poolSize = availablePoolSize(category, excluded);
  const isCoreEmpty = category === "Core" && pool.length === 0;

  const saveMutation = useMutation({
    mutationFn: () =>
      updatePartySetup(sessionId, {
        deckCategory: category,
        cardCount,
        excludedExercises: Array.from(excluded),
      }),
    onSuccess: onSaved,
    onError: (err: Error) =>
      toast("Couldn't save workout setup", { description: err.message }),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end justify-center"
      style={{ background: "oklch(0.05 0.005 260 / 0.85)" }}
      data-ocid="train-together.setup_sheet"
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.35 }}
        className="w-full max-w-[430px] rounded-t-3xl px-5 pt-5 pb-8 max-h-[88dvh] overflow-y-auto"
        style={{
          background: "oklch(0.13 0.01 260)",
          border: "1px solid oklch(0.68 0.25 180 / 0.25)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-black text-xl text-foreground">
            Workout setup
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-card border border-border/60 flex items-center justify-center text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs font-display font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Deck
        </p>
        <div className="flex gap-2 mb-5 flex-wrap">
          {DECK_CHOICES.map((cat) => {
            const disabled =
              cat === "Core" &&
              EXERCISE_CATALOG.filter((ex) => ex.categories.includes(cat))
                .length === 0;
            return (
              <button
                key={cat}
                type="button"
                disabled={disabled}
                onClick={() => setCategory(cat)}
                className={cn(
                  "shrink-0 px-3.5 h-9 rounded-full text-xs font-display font-bold uppercase tracking-wide transition-smooth border flex items-center gap-1.5",
                  disabled && "opacity-40",
                  category === cat
                    ? "bg-primary text-background border-primary"
                    : "bg-card text-muted-foreground border-border/50",
                )}
                data-ocid={`train-together.deck.${cat}`}
              >
                <span>{DECK_CATEGORY_ICON[cat]}</span>
                {DECK_CATEGORY_LABEL[cat]}
                {disabled && " · Coming soon"}
              </button>
            );
          })}
        </div>

        <p className="text-xs font-display font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Card count
        </p>
        <div className="flex gap-2 mb-3">
          {CARD_COUNT_PRESETS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => {
                setUseCustomCount(false);
                setCardCount(count);
              }}
              className={cn(
                "flex-1 h-11 rounded-xl text-sm font-display font-bold uppercase tracking-wide transition-smooth border",
                !useCustomCount && cardCount === count
                  ? "bg-primary text-background border-primary"
                  : "bg-card text-muted-foreground border-border/50",
              )}
              data-ocid={`train-together.card_count.${count}`}
            >
              {count}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setUseCustomCount(true)}
            className={cn(
              "flex-1 h-11 rounded-xl text-sm font-display font-bold uppercase tracking-wide transition-smooth border",
              useCustomCount
                ? "bg-primary text-background border-primary"
                : "bg-card text-muted-foreground border-border/50",
            )}
            data-ocid="train-together.card_count.custom"
          >
            Custom
          </button>
        </div>
        {useCustomCount && (
          <div className="flex items-center gap-3 mb-2">
            <input
              type="range"
              min={MIN_CARD_COUNT}
              max={MAX_CARD_COUNT}
              value={cardCount}
              onChange={(e) => setCardCount(Number(e.target.value))}
              className="flex-1"
              data-ocid="train-together.card_count_slider"
            />
            <span className="font-display font-black text-lg text-primary tabular-nums w-10 text-right">
              {cardCount}
            </span>
          </div>
        )}
        {poolSize > 0 && poolSize < cardCount && (
          <p className="text-xs mb-3" style={{ color: "oklch(0.75 0.15 60)" }}>
            Only {poolSize} exercises available with your exclusions — some will
            repeat to fill {cardCount} cards.
          </p>
        )}
        {isCoreEmpty && (
          <p className="text-xs mb-3" style={{ color: "oklch(0.75 0.15 25)" }}>
            Core doesn't have any cards yet — pick another deck.
          </p>
        )}

        <p className="text-xs font-display font-bold uppercase tracking-widest text-muted-foreground mb-2 mt-2">
          Exclude exercises
        </p>
        <div className="flex flex-col gap-1.5 mb-7 max-h-[220px] overflow-y-auto">
          {pool.map((ex) => {
            const isExcluded = excluded.has(ex.name);
            return (
              <button
                key={ex.name}
                type="button"
                onClick={() =>
                  setExcluded((prev) => {
                    const next = new Set(prev);
                    if (next.has(ex.name)) next.delete(ex.name);
                    else next.add(ex.name);
                    return next;
                  })
                }
                className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 bg-card border border-border/40 text-left"
                data-ocid={`train-together.exclude.${ex.name}`}
              >
                <span
                  className={cn(
                    "font-body text-sm truncate",
                    isExcluded
                      ? "text-muted-foreground line-through"
                      : "text-foreground",
                  )}
                >
                  {ex.name}
                </span>
                <div
                  className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center shrink-0",
                    isExcluded
                      ? "border-border/50"
                      : "border-primary bg-primary",
                  )}
                >
                  {!isExcluded && (
                    <Check
                      className="w-3 h-3 text-background"
                      strokeWidth={3}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <Button
          className="w-full h-14 font-display font-black text-base tracking-[0.1em] rounded-2xl uppercase"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || isCoreEmpty || poolSize === 0}
          data-ocid="train-together.setup_save"
        >
          {saveMutation.isPending ? "Saving..." : "Save workout"}
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────

export default function TrainTogetherWaitingRoomPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { sessionId } = useParams({ strict: false }) as {
    sessionId?: string;
  };
  const [showSetup, setShowSetup] = useState(false);

  const myIdQuery = useQuery({
    queryKey: ["train-together-my-id"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
  });
  const myId = myIdQuery.data;

  const sessionQuery = useQuery({
    queryKey: ["train-together-session", sessionId],
    queryFn: () => getTrainTogetherSession(sessionId as string),
    enabled: !!sessionId,
  });
  const session = sessionQuery.data;

  const participantsQuery = useQuery({
    queryKey: ["train-together-participants", sessionId],
    queryFn: () => listSessionParticipants(sessionId as string),
    enabled: !!sessionId,
  });
  const participants = participantsQuery.data ?? [];
  const accepted = participants.filter((p) => p.inviteStatus === "accepted");
  const pending = participants.filter((p) => p.inviteStatus === "pending");

  // biome-ignore lint/correctness/useExhaustiveDependencies: subscriptions keyed on sessionId only, not on query client identity
  useEffect(() => {
    if (!sessionId) return;
    const unsubSession = subscribeToSession(sessionId, (updated) => {
      queryClient.setQueryData(["train-together-session", sessionId], updated);
      if (updated.status === "active") {
        navigate({
          to: "/train-together/session/$sessionId",
          params: { sessionId },
        });
      }
    });
    const unsubParticipants = subscribeToSessionParticipants(sessionId, () => {
      queryClient.invalidateQueries({
        queryKey: ["train-together-participants", sessionId],
      });
    });
    return () => {
      unsubSession();
      unsubParticipants();
    };
  }, [sessionId, navigate]);

  const readyMutation = useMutation({
    mutationFn: (isReady: boolean) => {
      if (!sessionId) throw new Error("Not ready yet.");
      return setParticipantReady(sessionId, isReady);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["train-together-participants", sessionId],
      }),
    onError: (err: Error) =>
      toast("Couldn't update ready state", { description: err.message }),
  });

  const startMutation = useMutation({
    mutationFn: () => {
      if (!session) throw new Error("Session not loaded yet.");
      return startTrainTogetherSession(session);
    },
    onError: (err: Error) =>
      toast("Couldn't start session", { description: err.message }),
  });

  const me = accepted.find((p) => p.userId === myId);
  const isHost = !!session && session.hostId === myId;
  const canStart =
    isHost && accepted.length >= 2 && accepted.every((p) => p.isReady);

  if (!session || participantsQuery.isLoading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center max-w-[430px] mx-auto">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto relative">
      <div
        className="pointer-events-none fixed inset-0 max-w-[430px] mx-auto"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.22 0.04 180 / 0.2) 0%, transparent 65%)",
        }}
      />

      <header className="relative flex items-center gap-3 px-5 pt-12 pb-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="w-10 h-10 rounded-xl bg-card border border-border/60 flex items-center justify-center text-muted-foreground hover:text-destructive transition-smooth shrink-0"
              data-ocid="train-together.waiting_leave"
            >
              <X className="w-4 h-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave this party?</AlertDialogTitle>
              <AlertDialogDescription>
                You can rejoin with the invite code if you change your mind.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => navigate({ to: "/train-together" })}
              >
                Leave
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Logo size="sm" iconOnly className="opacity-70" />
      </header>

      <div className="relative px-5 flex-1 overflow-y-auto">
        <h1 className="font-display font-black text-2xl text-foreground mb-1">
          Waiting room
        </h1>
        <p className="text-sm text-muted-foreground font-body mb-5">
          {DECK_CATEGORY_LABEL[session.deckCategory]} · {session.cardCount}{" "}
          cards
        </p>

        <div
          className="rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 mb-4"
          style={{
            background: "oklch(0.17 0.015 180 / 0.2)",
            border: "1px solid oklch(0.68 0.25 180 / 0.25)",
          }}
        >
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-body">
              Invite code
            </p>
            <p className="font-display font-black text-xl tracking-[0.2em] text-foreground">
              {session.inviteCode}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(session.inviteCode);
                  toast("Copied", { description: session.inviteCode });
                } catch {
                  toast("Couldn't copy");
                }
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                background: "oklch(0.68 0.25 180 / 0.15)",
                color: "oklch(0.68 0.25 180)",
              }}
              data-ocid="train-together.waiting_copy_code"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => shareInviteCode(session.inviteCode)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/40 text-muted-foreground"
              data-ocid="train-together.waiting_share_code"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isHost && (
          <button
            type="button"
            onClick={() => setShowSetup(true)}
            className="w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 border border-dashed border-border/60 text-left mb-6"
            data-ocid="train-together.open_setup"
          >
            <div className="min-w-0">
              <p className="font-display font-bold text-sm text-foreground">
                {DECK_CATEGORY_LABEL[session.deckCategory]} ·{" "}
                {session.cardCount} cards
                {session.excludedExercises.length > 0 &&
                  ` · ${session.excludedExercises.length} excluded`}
              </p>
              <p className="text-[11px] text-muted-foreground font-body">
                Tap to change the workout
              </p>
            </div>
          </button>
        )}

        <p className="text-xs font-display font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Party
        </p>
        <div className="flex flex-col gap-2 mb-4">
          {accepted.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 bg-card border border-border/50"
              data-ocid="train-together.waiting_participant"
            >
              <span className="font-body text-sm text-foreground truncate">
                {p.username}
                {p.userId === session.hostId && (
                  <span className="text-muted-foreground"> · Host</span>
                )}
              </span>
              <span
                className="flex items-center gap-1.5 text-[11px] font-display font-bold uppercase tracking-wider shrink-0"
                style={{
                  color: p.isReady
                    ? "oklch(0.68 0.25 180)"
                    : "oklch(0.6 0.02 260)",
                }}
              >
                {p.isReady ? <Check className="w-3.5 h-3.5" /> : null}
                {p.isReady ? "Ready" : "Not ready"}
              </span>
            </motion.div>
          ))}
          {pending.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 bg-card/50 border border-border/30"
              data-ocid="train-together.waiting_pending_participant"
            >
              <span className="font-body text-sm text-muted-foreground truncate">
                {p.username}
              </span>
              <span className="text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                Invited
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-auto px-5 pb-8 pt-2 flex flex-col gap-2">
        <Button
          className="w-full h-14 font-display font-black text-base tracking-[0.1em] rounded-2xl uppercase"
          variant={me?.isReady ? "outline" : "default"}
          onClick={() => readyMutation.mutate(!me?.isReady)}
          disabled={readyMutation.isPending || !me}
          data-ocid="train-together.waiting_ready_toggle"
        >
          {me?.isReady ? "I'm not ready" : "I'm ready"}
        </Button>

        {isHost && (
          <Button
            className="w-full h-12 rounded-2xl font-display font-bold text-sm tracking-[0.1em] uppercase"
            variant="outline"
            disabled={!canStart || startMutation.isPending}
            onClick={() => startMutation.mutate()}
            data-ocid="train-together.waiting_start"
          >
            {startMutation.isPending
              ? "Starting..."
              : accepted.length < 2
                ? "Waiting for the party..."
                : !canStart
                  ? "Waiting for everyone to be ready"
                  : "Start training"}
          </Button>
        )}
      </div>

      {showSetup && (
        <WorkoutSetupSheet
          sessionId={session.id}
          initialCategory={session.deckCategory}
          initialCardCount={session.cardCount}
          initialExcluded={session.excludedExercises}
          onClose={() => setShowSetup(false)}
          onSaved={() => {
            setShowSetup(false);
            queryClient.invalidateQueries({
              queryKey: ["train-together-session", sessionId],
            });
          }}
        />
      )}
    </div>
  );
}
