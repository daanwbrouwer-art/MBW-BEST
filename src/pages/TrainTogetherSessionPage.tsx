import { Logo } from "@/components/Logo";
import { ProgressBar } from "@/components/ProgressBar";
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
import { resolveExerciseIllustration } from "@/data/exerciseAssets";
import { useOnboarding } from "@/hooks/use-onboarding";
import {
  type TrainTogetherParticipant,
  type TrainTogetherSession,
  assignCardOwner,
  attributeCardAndAdvance,
  getTrainTogetherSession,
  listSessionParticipants,
  subscribeToSession,
  subscribeToSessionParticipants,
} from "@/lib/trainTogetherBackend";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ChevronRight, Trophy, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function formatDuration(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

// ─── "Whose card is this?" owner picker ────────────────────────────────────
// Shown whenever the current card has no owner yet (session.currentCardOwnerId
// is null) — asked BEFORE the card is performed, not attributed after the
// fact, so it's not dismissable: the party can't move on until someone
// claims the card. Every device sees the same claim via the realtime
// session subscription, so only one person's tap actually wins (the RPC is
// guarded on currentCardIndex + currentCardOwnerId is null).

function CardOwnerPicker({
  participants,
  isAssigning,
  onPick,
}: {
  participants: TrainTogetherParticipant[];
  isAssigning: boolean;
  onPick: (userId: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end justify-center"
      style={{ background: "oklch(0.05 0.005 260 / 0.85)" }}
      data-ocid="train-together.card_owner_picker"
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
        className="w-full max-w-[430px] rounded-t-3xl px-5 pt-5 pb-8"
        style={{
          background: "oklch(0.13 0.01 260)",
          border: "1px solid oklch(0.68 0.25 180 / 0.25)",
        }}
      >
        <h2 className="font-display font-black text-lg text-foreground mb-4">
          Whose card is this?
        </h2>
        <div className="flex flex-col gap-2">
          {participants.map((p) => (
            <button
              key={p.userId}
              type="button"
              disabled={isAssigning}
              onClick={() => onPick(p.userId)}
              className="flex items-center gap-3 rounded-2xl px-4 py-4 border text-left transition-smooth border-border/50 bg-card disabled:opacity-50"
              data-ocid={`train-together.card_owner_pick.${p.userId}`}
            >
              <span className="font-display font-bold text-base text-foreground">
                {p.username}
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Live per-participant stat strip ───────────────────────────────────────

function LiveStatsStrip({
  participants,
  total,
}: {
  participants: TrainTogetherParticipant[];
  total: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      {participants.map((p) => (
        <ProgressBar
          key={p.userId}
          current={p.cardsCompleted}
          total={total}
          label={p.username}
          className="opacity-80"
        />
      ))}
    </div>
  );
}

// ─── End-of-session leaderboard ────────────────────────────────────────────

function SessionSummary({
  participants,
  total,
}: {
  participants: TrainTogetherParticipant[];
  total: number;
}) {
  const navigate = useNavigate();
  const totalSeconds = participants.reduce((sum, p) => sum + p.totalSeconds, 0);
  const ranked = [...participants].sort(
    (a, b) => b.cardsCompleted - a.cardsCompleted,
  );

  return (
    <div className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto items-center px-6 pt-16 pb-10 text-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
        style={{
          background: "oklch(0.68 0.25 180 / 0.15)",
          border: "2px solid oklch(0.68 0.25 180 / 0.4)",
        }}
      >
        <Trophy className="w-9 h-9" style={{ color: "oklch(0.68 0.25 180)" }} />
      </motion.div>
      <h1 className="font-display font-black text-2xl text-foreground mb-1">
        Session complete!
      </h1>
      <p className="text-sm text-muted-foreground font-body mb-8">
        {formatDuration(totalSeconds)} · {total} cards
      </p>

      <div className="w-full flex flex-col gap-2.5 mb-10">
        {ranked.map((p, i) => (
          <div
            key={p.userId}
            className="flex items-center gap-3 rounded-2xl px-4 py-3.5 bg-card border border-border/50 text-left"
            data-ocid="train-together.summary_row"
          >
            <span className="font-display font-black text-sm text-muted-foreground w-5 shrink-0">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-sm text-foreground truncate">
                {p.username}
              </p>
              <p className="text-[11px] text-muted-foreground font-body">
                {p.cardsCompleted}/{total} cards ·{" "}
                {formatDuration(p.totalSeconds)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display font-black text-sm text-primary tabular-nums">
                {p.totalReps} reps
              </p>
              {p.totalHoldSeconds > 0 && (
                <p className="text-[11px] text-muted-foreground font-body tabular-nums">
                  {Math.round(p.totalHoldSeconds)}s held
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button
        className="w-full h-14 font-display font-black text-base tracking-[0.1em] rounded-2xl uppercase"
        onClick={() => navigate({ to: "/train-together" })}
        data-ocid="train-together.session_finish"
      >
        Back to Train Together
      </Button>
    </div>
  );
}

// ─── Live session runner ───────────────────────────────────────────────────

function SessionRunner({
  sessionId,
  session,
}: {
  sessionId: string;
  session: TrainTogetherSession;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { gender } = useOnboarding();

  const [holdCountdown, setHoldCountdown] = useState(0);
  const [holdComplete, setHoldComplete] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const steps = session.cardSequence ?? [];
  const total = steps.length;
  const index = session.currentCardIndex;
  const current = steps[index];

  const participantsQuery = useQuery({
    queryKey: ["train-together-participants", sessionId],
    queryFn: () => listSessionParticipants(sessionId),
  });
  const participants = (participantsQuery.data ?? []).filter(
    (p) => p.inviteStatus === "accepted",
  );
  const owner =
    participants.find((p) => p.userId === session.currentCardOwnerId) ?? null;
  const needsOwner = !!current && !owner;

  // biome-ignore lint/correctness/useExhaustiveDependencies: subscription keyed on sessionId only
  useEffect(() => {
    const unsub = subscribeToSessionParticipants(sessionId, () => {
      queryClient.invalidateQueries({
        queryKey: ["train-together-participants", sessionId],
      });
    });
    return unsub;
  }, [sessionId]);

  // Same tick-every-second / vibrate-on-complete pattern used everywhere
  // else in the app for isometric hold exercises. Keyed off the shared
  // card index, since the card itself is shared across every device.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on step identity
  useEffect(() => {
    if (!current || !current.isIsometric) {
      setHoldCountdown(0);
      setHoldComplete(false);
      return;
    }
    setHoldCountdown(current.value);
    setHoldComplete(false);

    const interval = setInterval(() => {
      setHoldCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setHoldComplete(true);
          if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [index, current?.key]);

  const handleAssignOwner = async (ownerUserId: string) => {
    if (!current || isAssigning) return;
    setIsAssigning(true);
    if (navigator.vibrate) navigator.vibrate(30);
    try {
      await assignCardOwner({ sessionId, expectedIndex: index, ownerUserId });
    } catch (err) {
      toast("Couldn't assign this card", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleFinishCard = async () => {
    if (!current || !owner || isAdvancing) return;
    setIsAdvancing(true);
    if (navigator.vibrate) navigator.vibrate(50);
    try {
      await attributeCardAndAdvance({
        sessionId,
        expectedIndex: index,
        reps: current.isIsometric ? 0 : current.value,
        holdSeconds: current.isIsometric ? current.value : 0,
      });
    } catch (err) {
      toast("Couldn't record that card", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsAdvancing(false);
    }
  };

  if (session.status === "completed") {
    return <SessionSummary participants={participants} total={total} />;
  }

  if (!current) return null;

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
              data-ocid="train-together.session_quit"
            >
              <X className="w-4 h-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Quit this session?</AlertDialogTitle>
              <AlertDialogDescription>
                The rest of the party can keep going without you, but your
                progress in this session stops here.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep going</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => navigate({ to: "/train-together" })}
              >
                Quit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Logo size="sm" iconOnly className="opacity-70" />
      </header>

      <div className="relative px-5 pb-3 flex flex-col gap-3">
        <ProgressBar current={index + 1} total={total} label="PARTY" />
        <LiveStatsStrip participants={participants} total={total} />
      </div>

      <div className="relative flex-1 px-5 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.key}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col"
          >
            <div
              className="relative w-full rounded-3xl overflow-hidden mb-4"
              style={{
                aspectRatio: "1 / 1",
                background: "oklch(0.16 0.01 260)",
                border: current.modifier
                  ? `1.5px solid ${current.modifier === "double" ? "oklch(0.76 0.22 60 / 0.4)" : "oklch(0.78 0.04 240 / 0.35)"}`
                  : "1px solid oklch(0.68 0.25 180 / 0.2)",
                boxShadow: current.modifier
                  ? `0 0 24px ${current.modifier === "double" ? "oklch(0.76 0.22 60 / 0.25)" : "oklch(0.78 0.04 240 / 0.2)"}`
                  : undefined,
              }}
            >
              <img
                src={resolveExerciseIllustration(current.name, gender)}
                alt={current.name}
                className="w-full h-full object-cover"
              />
              {current.modifier && (
                <div
                  className="absolute top-3 left-3 flex items-center gap-1 text-[10px] font-display font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full"
                  style={{
                    background:
                      current.modifier === "double"
                        ? "oklch(0.76 0.22 60 / 0.9)"
                        : "oklch(0.78 0.04 240 / 0.85)",
                    color: "oklch(0.08 0.005 260)",
                  }}
                  data-ocid="train-together.modifier_banner"
                >
                  {current.modifier === "double" ? "×2 DOUBLE" : "÷2 HALF"}
                </div>
              )}
            </div>

            <div className="flex items-end justify-between mb-2">
              <div className="min-w-0 flex-1 mr-4">
                <p className="text-xs font-body text-white/60 uppercase tracking-widest mb-1">
                  STEP {index + 1} OF {total}
                </p>
                {owner && (
                  <p
                    className="text-xs font-display font-bold uppercase tracking-widest mb-1"
                    style={{ color: "oklch(0.68 0.25 180)" }}
                    data-ocid="train-together.current_owner_label"
                  >
                    {owner.username}'s turn
                  </p>
                )}
                <h2 className="font-display font-bold text-2xl text-foreground uppercase tracking-wide leading-tight">
                  {current.name}
                  {current.eachSide && (
                    <span className="text-sm text-muted-foreground normal-case tracking-normal font-body">
                      {" "}
                      (each side)
                    </span>
                  )}
                </h2>
                {current.modifier && (
                  <p
                    className="text-xs font-display font-bold uppercase tracking-widest mt-1"
                    style={{
                      color:
                        current.modifier === "double"
                          ? "oklch(0.76 0.22 60)"
                          : "oklch(0.78 0.04 240)",
                    }}
                  >
                    {current.modifier === "double"
                      ? "Double the previous exercise"
                      : "Half the previous exercise"}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                {current.isIsometric ? (
                  holdComplete ? (
                    <div className="font-display font-black text-2xl text-primary leading-none tabular-nums text-shadow-glow">
                      Hold complete!
                    </div>
                  ) : (
                    <>
                      <div className="font-display font-black text-5xl text-primary leading-none text-shadow-glow tabular-nums">
                        {holdCountdown}
                      </div>
                      <div className="text-xs font-body text-white/60 uppercase tracking-widest mt-1">
                        SECONDS
                      </div>
                    </>
                  )
                ) : (
                  <>
                    <div className="font-display font-black text-5xl text-primary leading-none text-shadow-glow tabular-nums">
                      {current.value}
                    </div>
                    <div className="text-xs font-body text-white/60 uppercase tracking-widest mt-1">
                      REPS
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-5 pt-1 pb-6">
        <motion.div whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.01 }}>
          <Button
            className="w-full h-14 font-display font-black text-xl tracking-[0.15em] rounded-2xl uppercase shadow-[0_0_40px_oklch(0.68_0.25_180/0.35)]"
            onClick={handleFinishCard}
            disabled={isAdvancing || needsOwner}
            data-ocid="train-together.session_next"
          >
            {index >= total - 1 ? (
              <span className="flex items-center gap-2">
                FINISH
                <ChevronRight className="w-5 h-5" />
              </span>
            ) : (
              <span className="flex items-center gap-2">
                NEXT EXERCISE
                <ChevronRight className="w-5 h-5" />
              </span>
            )}
          </Button>
        </motion.div>
      </div>

      <AnimatePresence>
        {needsOwner && (
          <CardOwnerPicker
            participants={participants}
            isAssigning={isAssigning}
            onPick={handleAssignOwner}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TrainTogetherSessionPage() {
  const queryClient = useQueryClient();
  const { sessionId } = useParams({ strict: false }) as {
    sessionId?: string;
  };

  const sessionQuery = useQuery({
    queryKey: ["train-together-session", sessionId],
    queryFn: () => getTrainTogetherSession(sessionId as string),
    enabled: !!sessionId,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: subscription keyed on sessionId only
  useEffect(() => {
    if (!sessionId) return;
    const unsub = subscribeToSession(sessionId, (updated) => {
      queryClient.setQueryData(["train-together-session", sessionId], updated);
    });
    return unsub;
  }, [sessionId]);

  if (!sessionId || !sessionQuery.data) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center max-w-[430px] mx-auto">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return <SessionRunner sessionId={sessionId} session={sessionQuery.data} />;
}
