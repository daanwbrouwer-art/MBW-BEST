import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";

/** Shown for any address the app doesn't know, with a way back. */
export function NotFound() {
  const navigate = useNavigate();
  return (
    <div
      className="min-h-dvh bg-background flex flex-col items-center justify-center gap-4 px-8 text-center max-w-[430px] mx-auto"
      data-ocid="not-found.page"
    >
      <p className="text-5xl" aria-hidden="true">
        🃏
      </p>
      <h1 className="font-display font-black text-2xl text-foreground">
        This card isn't in the deck
      </h1>
      <p className="text-sm text-muted-foreground font-body max-w-[280px]">
        The page you were looking for doesn't exist.
      </p>
      <Button
        className="h-12 px-6 rounded-2xl font-display font-black uppercase tracking-[0.1em]"
        onClick={() => navigate({ to: "/home", replace: true })}
        data-ocid="not-found.home_button"
      >
        Go to Home
      </Button>
    </div>
  );
}
