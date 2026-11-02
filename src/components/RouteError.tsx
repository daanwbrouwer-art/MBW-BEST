import type { ErrorComponentProps } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";

/**
 * Router-level error boundary. A render crash anywhere below the root used
 * to leave a blank white screen with no way out; this keeps the user inside
 * the app with a retry and a way home. Saved workouts live in localStorage,
 * so nothing is lost by reloading.
 */
export function RouteError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="dark min-h-dvh bg-background flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <p className="text-5xl mb-4" aria-hidden="true">
          🃏
        </p>
        <h1 className="font-display font-black text-2xl text-foreground mb-2">
          Wrong card drawn
        </h1>
        <p className="text-base text-muted-foreground font-body mb-6">
          Something went wrong on this screen. Your saved workouts are safe.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={reset}
            className="h-12 rounded-2xl bg-primary text-primary-foreground font-display font-bold flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Try again
          </button>
          <a
            href="/home"
            className="h-12 rounded-2xl border border-border text-foreground font-display font-bold flex items-center justify-center"
          >
            Back to home
          </a>
        </div>
        {import.meta.env.DEV && (
          <pre className="mt-6 text-left text-xs text-muted-foreground whitespace-pre-wrap break-words">
            {error.message}
          </pre>
        )}
      </div>
    </div>
  );
}
