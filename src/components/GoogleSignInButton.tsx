import { isGoogleSignInAvailable, startGoogleSignIn } from "@/lib/googleSignIn";
import { openPrivacyPolicy, openTermsOfUse } from "@/lib/legal";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";

/**
 * "Continue with Google" plus the age and terms consent the email form asks
 * for: this button can create an account from either screen. Renders nothing
 * until Google is enabled for the project.
 */
export function GoogleSignInButton({ ocid }: { ocid: string }) {
  const { data: available } = useQuery({
    queryKey: ["google-sign-in-available"],
    queryFn: isGoogleSignInAvailable,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  if (!available) return null;

  const handleClick = async () => {
    if (!agreed) {
      setError("Tick the box above to continue with Google");
      return;
    }
    setError("");
    try {
      await startGoogleSignIn();
    } catch (err) {
      console.warn("Google sign-in could not start:", err);
      setError("Couldn't open Google. Check your connection and try again.");
    }
  };

  const consentId = `${ocid}-consent`;
  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex items-start gap-3">
        <input
          id={consentId}
          type="checkbox"
          checked={agreed}
          onChange={(e) => {
            setAgreed(e.target.checked);
            setError("");
          }}
          className="mt-0.5 w-4 h-4 shrink-0 accent-primary cursor-pointer"
        />
        <label
          htmlFor={consentId}
          className="font-body text-xs text-white/50 leading-relaxed cursor-pointer"
        >
          For Google: I am 16 or older and agree to the{" "}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              openTermsOfUse();
            }}
            className="underline text-white/70 hover:text-white transition-smooth"
          >
            Terms of Use
          </button>{" "}
          and{" "}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              openPrivacyPolicy();
            }}
            className="underline text-white/70 hover:text-white transition-smooth"
          >
            Privacy Policy
          </button>
          .
        </label>
      </div>
      <button
        type="button"
        onClick={handleClick}
        className="w-full h-14 rounded-full flex items-center justify-center gap-3 font-display font-bold text-sm tracking-wide transition-smooth hover:opacity-90 active:scale-[0.98]"
        style={{
          background: "oklch(0.96 0.002 var(--neutral-hue))",
          color: "oklch(0.16 0.01 var(--neutral-hue))",
        }}
        data-ocid={ocid}
      >
        <FcGoogle className="w-5 h-5" aria-hidden="true" />
        Continue with Google
      </button>
      {error && (
        <p
          role="alert"
          className="font-body text-sm text-center"
          style={{ color: "oklch(0.75 0.12 25)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
