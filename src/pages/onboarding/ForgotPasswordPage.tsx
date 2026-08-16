import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

const RESET_REDIRECT = "https://reset.my-bodyweight.com";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_REDIRECT,
    });
    // Never surface the actual outcome — Supabase's own resetPasswordForEmail
    // already avoids leaking whether the email is registered, but errors
    // like an SMTP outage or rate limit would otherwise tell an attacker
    // something changed. Log for debugging, always show the same message.
    if (error) console.warn("resetPasswordForEmail:", error.message);
    setIsLoading(false);
    setSent(true);
  };

  return (
    <div
      className="min-h-dvh flex flex-col max-w-[430px] mx-auto relative overflow-hidden bg-background"
      data-ocid="forgot-password.page"
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
          onClick={() => navigate({ to: "/onboarding/auth" })}
          data-ocid="forgot-password.back_button"
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
          <div className="mb-8">
            <h1 className="font-display font-black text-3xl uppercase tracking-widest-custom leading-none text-white mb-1">
              RESET PASSWORD
            </h1>
            <p className="font-body text-sm text-white/45 leading-relaxed">
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          {sent ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center mt-8"
            >
              <p className="font-body text-white mb-4">
                Check your email — the reset link will open in your browser.
                Come back and sign in with your new password after resetting.
              </p>
              <button
                type="button"
                onClick={() => navigate({ to: "/onboarding/auth" })}
                className="font-body text-sm font-bold text-primary transition-smooth hover:opacity-75"
                data-ocid="forgot-password.back_to_sign_in_link"
              >
                Back to Sign In
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col flex-1">
              <div className="mb-6">
                <label
                  htmlFor="forgot-email"
                  className="font-display text-xs font-bold uppercase tracking-widest text-white/50 mb-2 block"
                >
                  Email
                </label>
                <div
                  className="w-full h-14 rounded-2xl flex items-center px-4 gap-3 transition-smooth focus-within:border-primary/60"
                  style={{
                    background: "oklch(0.17 0.012 260)",
                    border: "1px solid oklch(0.28 0.01 260)",
                  }}
                >
                  <svg
                    width="16"
                    height="12"
                    viewBox="0 0 18 14"
                    fill="none"
                    className="shrink-0"
                    role="img"
                    aria-hidden="true"
                    style={{ color: "oklch(0.55 0.008 260)" }}
                  >
                    <path
                      d="M1 1h16v12H1V1zm0 0l8 7 8-7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 bg-transparent font-body text-sm text-white placeholder:text-white/25 outline-none"
                    data-ocid="forgot-password.email_input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 rounded-full flex items-center justify-center font-display font-bold text-sm tracking-wide bg-primary text-background transition-smooth hover:opacity-90 active:scale-[0.98]"
                data-ocid="forgot-password.submit_button"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
