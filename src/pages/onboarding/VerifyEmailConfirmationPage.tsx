import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";

export default function VerifyEmailConfirmationPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-dvh flex flex-col items-center max-w-[430px] mx-auto px-6 relative overflow-hidden bg-background"
      data-ocid="verify-email-confirmation.page"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.22 0.04 180 / 0.2) 0%, transparent 55%)",
        }}
      />

      <div className="relative z-10 flex flex-col flex-1 items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <img
            src="/assets/images/mbw-logo-white-icon.png"
            alt="MyBodyWeight"
            className="w-16 h-16 object-contain mx-auto"
            style={{
              filter: "drop-shadow(0 0 10px oklch(0.68 0.25 180 / 0.3))",
            }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h1 className="font-display font-black text-2xl uppercase tracking-widest-custom text-white mb-3">
            CHECK YOUR INBOX.
          </h1>
          <p className="font-body text-white/55 mb-8 max-w-[320px] mx-auto leading-relaxed">
            We sent a verification link to your email. Tap it to unlock your
            account.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/onboarding/auth" })}
            className="w-full h-14 rounded-full flex items-center justify-center font-display font-bold text-sm tracking-wide bg-primary text-background transition-smooth hover:opacity-90"
            data-ocid="verify-email-confirmation.back_to_login_button"
          >
            BACK TO LOGIN
          </button>
        </motion.div>
      </div>
    </div>
  );
}
