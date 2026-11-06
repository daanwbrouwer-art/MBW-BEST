import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Users } from "lucide-react";

/**
 * Shown instead of an endless spinner when a Train Together link points at a
 * party that doesn't exist, was cancelled, or has already finished.
 */
export function PartyUnavailable({
  reason,
}: {
  reason: "missing" | "ended";
}) {
  const navigate = useNavigate();
  return (
    <div
      className="min-h-dvh bg-background flex flex-col items-center justify-center gap-4 px-8 text-center max-w-[430px] mx-auto"
      data-ocid="train-together.party_unavailable"
    >
      <div className="w-14 h-14 rounded-2xl bg-card border border-border/60 flex items-center justify-center">
        <Users className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <h1 className="font-display font-black text-2xl text-foreground">
        {reason === "ended" ? "This party has ended" : "Party not found"}
      </h1>
      <p className="text-sm text-muted-foreground font-body max-w-[280px]">
        {reason === "ended"
          ? "Start a new party or join one with a fresh invite code."
          : "This link doesn't match a party you're in. Ask for a new invite code."}
      </p>
      <Button
        variant="pulse"
        className="h-12 px-6 rounded-2xl font-display font-black uppercase tracking-[0.1em]"
        onClick={() => navigate({ to: "/train-together", replace: true })}
        data-ocid="train-together.party_unavailable_back"
      >
        Back to Train Together
      </Button>
    </div>
  );
}
