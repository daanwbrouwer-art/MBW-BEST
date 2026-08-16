import { openPrivacyPolicy, openTermsOfUse } from "@/lib/legal";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

function SocialButton({
  icon,
  label,
  onClick,
  ocid,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  ocid: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-14 rounded-full flex items-center justify-center gap-3 font-display font-bold text-sm tracking-wide transition-smooth hover:opacity-90 active:scale-[0.98]"
      style={{
        background: "oklch(0.96 0.002 260)",
        color: "oklch(0.16 0.01 260)",
      }}
      data-ocid={ocid}
    >
      <span className="text-lg leading-none" aria-hidden="true">
        {icon}
      </span>
      {label}
    </button>
  );
}

export default function CreateAccountPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-dvh flex flex-col max-w-[430px] mx-auto relative overflow-hidden bg-background"
      data-ocid="create-account.page"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.22 0.04 180 / 0.2) 0%, transparent 55%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-5 pt-12 pb-2">
        <button
          type="button"
          className="w-10 h-10 rounded-2xl bg-card/60 border border-border/40 flex items-center justify-center text-white/50 hover:text-white hover:border-primary/40 transition-smooth"
          onClick={() => navigate({ to: "/onboarding/welcome" })}
          data-ocid="create-account.back_button"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <img
          src="/assets/images/mbw-logo-white-icon.png"
          alt="MyBodyWeight"
          className="w-10 h-10 object-contain"
          style={{ filter: "drop-shadow(0 0 10px oklch(0.68 0.25 180 / 0.3))" }}
        />
        <div className="w-10" />
      </header>

      <div className="relative z-10 flex flex-col flex-1 px-6 pt-6 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col flex-1"
        >
          <div className="mb-10 text-center">
            <h1 className="font-display font-black text-3xl uppercase tracking-widest-custom leading-none text-white mb-3">
              Almost there!
            </h1>
            <p className="font-body text-sm text-white/45 leading-relaxed max-w-[300px] mx-auto">
              Create an account to save your progress and unlock more workouts
            </p>
          </div>

          {/* TODO: Sign in with Apple + Google are post-launch milestone
              work, not cosmetic — once either ships, Apple requires Sign in
              with Apple to be offered within 6 months as an equivalent
              option (Guideline 4.8). Submitting email-only for now avoids
              committing to that clock before either is actually built. */}
          <div className="flex flex-col gap-3">
            <SocialButton
              icon="✉️"
              label="Continue with email"
              onClick={() =>
                navigate({ to: "/onboarding/create-account/email" })
              }
              ocid="create-account.email_button"
            />
          </div>

          <p className="font-body text-xs text-white/30 text-center mt-4">
            Nothing is shared without your permission.
          </p>

          <div className="flex-1 flex items-center justify-center">
            <p className="font-body text-sm text-white/40 text-center">
              <button
                type="button"
                onClick={() => navigate({ to: "/onboarding/auth" })}
                className="font-bold text-primary transition-smooth hover:opacity-75"
                data-ocid="create-account.login_link"
              >
                I already have an account
              </button>
            </p>
          </div>

          <p className="font-body text-[11px] text-white/30 text-center leading-relaxed">
            By creating an account, I agree to the MyBodyWeight{" "}
            <button
              type="button"
              onClick={openTermsOfUse}
              className="underline text-white/45 hover:text-white/70 transition-smooth"
              data-ocid="create-account.terms_link"
            >
              Terms of Use
            </button>{" "}
            and{" "}
            <button
              type="button"
              onClick={openPrivacyPolicy}
              className="underline text-white/45 hover:text-white/70 transition-smooth"
              data-ocid="create-account.privacy_link"
            >
              Privacy Policy
            </button>
            .
          </p>
        </motion.div>
      </div>
    </div>
  );
}
