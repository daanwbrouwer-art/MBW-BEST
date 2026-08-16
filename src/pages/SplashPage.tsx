import { hasSeenNotificationPrompt } from "@/hooks/use-notifications";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useCallback } from "react";

export default function SplashPage() {
  const navigate = useNavigate();

  const handleTap = useCallback(() => {
    if (!hasSeenNotificationPrompt()) {
      navigate({ to: "/onboarding/notifications" });
      return;
    }
    const isEmailAuth = localStorage.getItem("mbw_user") !== null;
    if (isEmailAuth) {
      navigate({ to: "/home" });
    } else {
      navigate({ to: "/onboarding/welcome" });
    }
  }, [navigate]);

  return (
    <button
      type="button"
      className="min-h-dvh w-full flex flex-col items-center justify-between bg-background relative overflow-hidden cursor-pointer select-none"
      data-ocid="splash.page"
      onClick={handleTap}
      aria-label="Tap to continue"
    >
      {/* Deep radial glow behind logo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 45%, oklch(0.22 0.06 180 / 0.35) 0%, oklch(0.15 0.02 220 / 0.1) 55%, transparent 75%)",
        }}
      />

      {/* Spacer top */}
      <div className="flex-1" />

      {/* Center content */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col items-center gap-6 px-8 text-center"
      >
        {/* Logo icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: "oklch(0.68 0.25 180 / 0.22)",
              filter: "blur(24px)",
              transform: "scale(1.8)",
            }}
          />
          <img
            src="/assets/images/mbw-logo-white-icon.png"
            alt="MyBodyWeight"
            className="relative w-24 h-24 object-contain"
            style={{
              filter: "drop-shadow(0 0 18px oklch(0.68 0.25 180 / 0.45))",
            }}
          />
        </motion.div>

        {/* Brand name */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-2"
        >
          <h1 className="font-display font-black text-3xl tracking-widest-custom uppercase leading-none text-white">
            MYBODYWEIGHT
          </h1>
          <p className="font-display font-bold text-sm tracking-widest-custom uppercase text-primary">
            TRAIN LIKE AN ATHLETE
          </p>
        </motion.div>

        {/* Sub-tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="flex flex-col items-center gap-2"
        >
          <div
            className="h-px w-24"
            style={{
              background:
                "linear-gradient(to right, transparent, oklch(0.68 0.25 180 / 0.5), transparent)",
            }}
          />
          <p className="font-display font-bold text-[11px] tracking-[0.2em] uppercase text-white/60">
            YOUR BODY. YOUR RULES.
          </p>
          <div
            className="h-px w-24"
            style={{
              background:
                "linear-gradient(to right, transparent, oklch(0.68 0.25 180 / 0.5), transparent)",
            }}
          />
        </motion.div>
      </motion.div>

      {/* Spacer middle */}
      <div className="flex-1" />

      {/* Tap to continue — bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.6 }}
        className="relative pb-16 flex flex-col items-center gap-2"
      >
        <motion.p
          animate={{ opacity: [0.35, 0.85, 0.35] }}
          transition={{
            duration: 2.2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          className="font-display text-[11px] tracking-[0.25em] uppercase text-white/50"
        >
          TAP TO CONTINUE
        </motion.p>
        <motion.div
          animate={{ y: [0, 4, 0] }}
          transition={{
            duration: 1.6,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          style={{ color: "oklch(0.68 0.25 180 / 0.6)" }}
        >
          <svg
            width="16"
            height="10"
            viewBox="0 0 16 10"
            fill="none"
            role="img"
            aria-label="Scroll down"
          >
            <path
              d="M1 1L8 8L15 1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </motion.div>
    </button>
  );
}
