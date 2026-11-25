import { Button } from "@/components/ui/button";
import { useActor } from "@/hooks/use-local-actor";
import { completeSignIn } from "@/lib/accountSession";
import {
  hasCompletedOnboarding,
  migrateGuestProgress,
} from "@/lib/completeSignup";
import { finishGoogleSignIn, isNewAccount } from "@/lib/googleSignIn";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

/** Where Google comes back to: finishes the sign-in and moves on. */
export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const { actor } = useActor();
  const { code = "" } = useSearch({ strict: false }) as { code?: string };
  const [error, setError] = useState("");
  // Each code works once.
  const handledCode = useRef<string | null>(null);

  useEffect(() => {
    if (handledCode.current === code) return;
    handledCode.current = code;
    if (!code) {
      setError("Google sign-in was cancelled.");
      return;
    }
    setError("");
    const finish = async () => {
      const user = await finishGoogleSignIn(code);
      const result = await actor.getMyProfile();
      if (result.__kind__ === "err") throw new Error(result.err);
      if (isNewAccount(user)) {
        await completeSignIn(result.ok, {
          isNewAccount: true,
          afterLocalSetup: migrateGuestProgress,
        });
        navigate({
          to: hasCompletedOnboarding() ? "/home" : "/onboarding",
          replace: true,
        });
        return;
      }
      await completeSignIn(result.ok);
      const isFirstLogin = localStorage.getItem("mbw_first_login") === null;
      localStorage.setItem("mbw_first_login", "done");
      navigate({ to: isFirstLogin ? "/welcome-tips" : "/home", replace: true });
    };
    finish().catch((err) => {
      console.warn("Google sign-in failed:", err);
      setError("Google sign-in didn't complete. Please try again.");
    });
  }, [code, actor, navigate]);

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center gap-6 px-6 max-w-[430px] mx-auto bg-background text-center"
      data-ocid="google-callback.page"
    >
      {error ? (
        <>
          <p role="alert" className="font-body text-sm text-white/70">
            {error}
          </p>
          <Button
            className="h-14 px-8 rounded-full font-display font-black text-sm uppercase tracking-widest-custom"
            onClick={() => navigate({ to: "/onboarding/auth", replace: true })}
            data-ocid="google-callback.back_button"
          >
            Back to sign in
          </Button>
        </>
      ) : (
        <>
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p role="status" className="font-body text-sm text-white/50">
            Signing you in...
          </p>
        </>
      )}
    </div>
  );
}
