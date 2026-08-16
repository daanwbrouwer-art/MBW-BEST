import { useWorkoutStore } from "@/store/workout";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

export default function WelcomePage() {
  const navigate = useNavigate();
  const setGuestMode = useWorkoutStore((s) => s.setGuestMode);
  const guestMode = useWorkoutStore((s) => s.guestMode);
  const [dismissBanner, setDismissBanner] = useState(false);

  const handleGuestMode = () => {
    setGuestMode(true);
    navigate({ to: "/onboarding" });
  };

  return (
    <div
      className="min-h-dvh flex flex-col items-center max-w-[430px] mx-auto px-6 relative overflow-hidden bg-background"
      data-ocid="onboarding-welcome.page"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, oklch(0.22 0.05 180 / 0.28) 0%, transparent 60%)",
        }}
      />

      {guestMode && !dismissBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full mt-4 mb-2 px-4 py-3 rounded-xl flex items-center justify-between"
          style={{
            background: "oklch(0.22 0.04 180 / 0.3)",
            border: "1px solid oklch(0.68 0.25 180 / 0.3)",
          }}
        >
          <p className="font-body text-sm text-white">
            Save your progress — create a free account
          </p>
          <button
            type="button"
            onClick={() => setDismissBanner(true)}
            className="text-white/60 hover:text-white transition-smooth"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 pt-16 pb-6"
      >
        <img
          src="/assets/images/mbw-logo-white-icon.png"
          alt="MyBodyWeight"
          className="w-20 h-20 object-contain mx-auto"
          style={{
            filter: "drop-shadow(0 0 14px oklch(0.68 0.25 180 / 0.35))",
          }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 text-center mb-10"
      >
        <h1 className="font-display font-black text-4xl uppercase tracking-widest-custom leading-none text-white mb-2">
          MYBODYWEIGHT
        </h1>
        <p className="font-display font-bold text-lg uppercase tracking-widest-custom text-primary">
          TRAIN LIKE AN ATHLETE
        </p>
        <p className="font-body text-sm text-white/55 mt-3 leading-relaxed max-w-[280px] mx-auto">
          YOUR BODY. YOUR RULES.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full flex flex-col gap-3"
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/onboarding/create-account" })}
          className="w-full h-14 rounded-full flex items-center justify-center font-display font-bold text-sm tracking-wide bg-primary text-background transition-smooth hover:opacity-90 active:scale-[0.98]"
          data-ocid="onboarding-welcome.create_account_button"
        >
          Sign Up
        </button>

        <button
          type="button"
          onClick={() => navigate({ to: "/onboarding/auth" })}
          className="w-full h-14 rounded-full flex items-center justify-center font-display font-bold text-sm tracking-wide text-foreground border border-white/40 bg-transparent transition-smooth hover:opacity-90 active:scale-[0.98]"
          data-ocid="onboarding-welcome.sign_in_button"
        >
          Sign In
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="relative z-10 mt-auto pb-10 pt-6"
      >
        <button
          type="button"
          onClick={handleGuestMode}
          className="font-body text-sm text-foreground/50 hover:text-foreground/80 transition-smooth"
          data-ocid="onboarding-welcome.guest_button"
        >
          Continue as Guest
        </button>
      </motion.div>
    </div>
  );
}
