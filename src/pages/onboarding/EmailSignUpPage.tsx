import { Button } from "@/components/ui/button";
import { hashPassword } from "@/hooks/use-auth";
import { useActor } from "@/hooks/use-local-actor";
import {
  hasCompletedOnboarding,
  migrateGuestAchievements,
  migrateGuestOnboarding,
  migrateGuestStreak,
  migrateGuestWeeklyChallenge,
} from "@/lib/completeSignup";
import { ensureReferralCode, redeemReferralCode } from "@/lib/referral";
import { useWorkoutStore } from "@/store/workout";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

export default function EmailSignUpPage() {
  const navigate = useNavigate();
  const { actor } = useActor();
  const setGuestMode = useWorkoutStore((s) => s.setGuestMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const validate = () => {
    if (!username || username.length < 3 || username.length > 20) {
      return "Username must be 3-20 characters";
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return "Username can only contain letters, numbers, and underscores";
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Please enter a valid email address";
    }
    if (!password || password.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const passwordHash = await hashPassword(password);
      const result = await (actor as any).registerUser(
        username,
        email,
        passwordHash,
      );
      if ("ok" in result) {
        const loginResult = await (actor as any).loginUser(email, passwordHash);
        if ("ok" in loginResult) {
          localStorage.setItem("mbw_user", JSON.stringify(loginResult.ok));
          migrateGuestOnboarding();
          migrateGuestStreak();
          migrateGuestAchievements();
          migrateGuestWeeklyChallenge();
          ensureReferralCode(email);
          if (referralCode.trim()) redeemReferralCode(email, referralCode);
          setGuestMode(false);
          navigate({
            to: hasCompletedOnboarding() ? "/home" : "/onboarding",
            replace: true,
          });
        } else {
          // Account was created, but the immediate sign-in failed (e.g. the
          // project requires email confirmation, or a transient network
          // error). Previously this fell through and navigated forward
          // anyway with no session and no mbw_user set, leaving the user
          // stuck on a page that assumed they were logged in. Send them to
          // manual sign-in instead, with a clear reason.
          setError(
            loginResult.err ||
              "Account created, but sign-in didn't complete. Please sign in.",
          );
          navigate({ to: "/onboarding/auth" });
        }
      } else {
        setError(result.err || "Registration failed. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-dvh flex flex-col max-w-[430px] mx-auto relative overflow-hidden bg-background"
      data-ocid="email-signup.page"
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
          onClick={() => navigate({ to: "/onboarding/create-account" })}
          data-ocid="email-signup.back_button"
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
              CREATE YOUR ACCOUNT
            </h1>
            <p className="font-body text-sm text-white/45 leading-relaxed">
              Join the movement. Start your journey.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="mb-4">
              <label
                htmlFor="create-username"
                className="font-display text-xs font-bold uppercase tracking-widest text-white/50 mb-2 block"
              >
                Username
              </label>
              <div
                className="w-full h-14 rounded-2xl flex items-center px-4 gap-3 transition-smooth focus-within:border-primary/60"
                style={{
                  background: "oklch(0.17 0.012 260)",
                  border: "1px solid oklch(0.28 0.01 260)",
                }}
              >
                <svg
                  width="14"
                  height="16"
                  viewBox="0 0 16 18"
                  fill="none"
                  className="shrink-0"
                  role="img"
                  aria-hidden="true"
                  style={{ color: "oklch(0.55 0.008 260)" }}
                >
                  <circle
                    cx="8"
                    cy="6"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M1 17c0-3.866 3.134-7 7-7s7 3.134 7 7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  id="create-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="athlete_name"
                  className="flex-1 bg-transparent font-body text-sm text-white placeholder:text-white/25 outline-none"
                  data-ocid="email-signup.username_input"
                />
              </div>
            </div>

            <div className="mb-4">
              <label
                htmlFor="create-email"
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
                  id="create-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 bg-transparent font-body text-sm text-white placeholder:text-white/25 outline-none"
                  data-ocid="email-signup.email_input"
                />
              </div>
            </div>

            <div className="mb-4">
              <label
                htmlFor="create-password"
                className="font-display text-xs font-bold uppercase tracking-widest text-white/50 mb-2 block"
              >
                Password
              </label>
              <div
                className="w-full h-14 rounded-2xl flex items-center px-4 gap-3 transition-smooth focus-within:border-primary/60"
                style={{
                  background: "oklch(0.17 0.012 260)",
                  border: "1px solid oklch(0.28 0.01 260)",
                }}
              >
                <svg
                  width="14"
                  height="16"
                  viewBox="0 0 14 18"
                  fill="none"
                  className="shrink-0"
                  role="img"
                  aria-hidden="true"
                  style={{ color: "oklch(0.55 0.008 260)" }}
                >
                  <rect
                    x="1"
                    y="7"
                    width="12"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M4 7V5a3 3 0 1 1 6 0v2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  id="create-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent font-body text-sm text-white placeholder:text-white/25 outline-none"
                  data-ocid="email-signup.password_input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="shrink-0 text-white/30 hover:text-white/60 transition-smooth"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label
                htmlFor="create-confirm"
                className="font-display text-xs font-bold uppercase tracking-widest text-white/50 mb-2 block"
              >
                Confirm Password
              </label>
              <div
                className="w-full h-14 rounded-2xl flex items-center px-4 gap-3 transition-smooth focus-within:border-primary/60"
                style={{
                  background: "oklch(0.17 0.012 260)",
                  border: "1px solid oklch(0.28 0.01 260)",
                }}
              >
                <svg
                  width="14"
                  height="16"
                  viewBox="0 0 14 18"
                  fill="none"
                  className="shrink-0"
                  role="img"
                  aria-hidden="true"
                  style={{ color: "oklch(0.55 0.008 260)" }}
                >
                  <rect
                    x="1"
                    y="7"
                    width="12"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M4 7V5a3 3 0 1 1 6 0v2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  id="create-confirm"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent font-body text-sm text-white placeholder:text-white/25 outline-none"
                  data-ocid="email-signup.confirm_password_input"
                />
              </div>
            </div>

            <div className="mb-6">
              <label
                htmlFor="create-referral"
                className="font-display text-xs font-bold uppercase tracking-widest text-white/50 mb-2 block"
              >
                Referral code (optional)
              </label>
              <div
                className="w-full h-14 rounded-2xl flex items-center px-4 gap-3 transition-smooth focus-within:border-primary/60"
                style={{
                  background: "oklch(0.17 0.012 260)",
                  border: "1px solid oklch(0.28 0.01 260)",
                }}
              >
                <input
                  id="create-referral"
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="MBW-XXXXXX"
                  className="flex-1 bg-transparent font-body text-sm text-white placeholder:text-white/25 outline-none uppercase"
                  data-ocid="email-signup.referral_input"
                />
              </div>
              <p className="text-xs text-white/30 font-body mt-2">
                Have a friend's code? Get 10% off your first payment.
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 px-4 py-3 rounded-xl text-center"
                style={{
                  background: "oklch(0.25 0.04 25 / 0.3)",
                  border: "1px solid oklch(0.55 0.15 25 / 0.4)",
                }}
                data-ocid="email-signup.error_state"
              >
                <p
                  className="font-body text-sm"
                  style={{ color: "oklch(0.75 0.12 25)" }}
                >
                  {error}
                </p>
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full h-14 font-display font-black text-sm tracking-widest-custom rounded-full uppercase mb-4 mt-auto"
              style={{
                boxShadow:
                  "0 0 32px oklch(0.68 0.25 180 / 0.3), 0 4px 16px oklch(0 0 0 / 0.25)",
              }}
              disabled={isLoading}
              data-ocid="email-signup.submit_button"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Creating...
                </span>
              ) : (
                "Create Account"
              )}
            </Button>

            <p className="font-body text-sm text-white/40 text-center">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate({ to: "/onboarding/auth" })}
                className="font-bold text-primary transition-smooth hover:opacity-75"
                data-ocid="email-signup.login_link"
              >
                Sign In
              </button>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
