import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";

/**
 * Lighter-weight bottom-sheet prompt for features a free account alone
 * unlocks (no subscription needed) — e.g. a guest tapping "20 cards" or
 * Advanced difficulty. Distinct from PaywallModal, which is reserved for
 * genuinely subscriber-gated features.
 */
export function RegisterPromptModal({
  title,
  body,
  onClose,
}: {
  title: string;
  body: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  const handleRegister = () => {
    onClose();
    navigate({ to: "/onboarding/create-account" });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
      style={{ background: "oklch(0 0 0 / 0.75)" }}
      onClick={onClose}
      data-ocid="register-prompt.dialog"
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.42 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-3xl overflow-hidden"
        style={{
          background: "oklch(0.14 0.012 260)",
          border: "1px solid oklch(0.68 0.25 180 / 0.25)",
          boxShadow:
            "0 -4px 60px oklch(0.68 0.25 180 / 0.12), 0 20px 60px oklch(0 0 0 / 0.6)",
        }}
      >
        <div className="px-6 pt-6 pb-7">
          <div className="flex items-center gap-2.5 mb-4">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                background: "oklch(0.68 0.25 180 / 0.15)",
                border: "1px solid oklch(0.68 0.25 180 / 0.3)",
              }}
            >
              <span className="text-base">🔒</span>
            </div>
            <h3 className="font-display font-black text-lg text-foreground">
              {title}
            </h3>
          </div>
          <p className="text-sm font-body text-muted-foreground leading-relaxed mb-6">
            {body}
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleRegister}
              className="w-full h-12 rounded-2xl font-display font-black text-sm tracking-widest uppercase transition-smooth bg-primary text-background"
              style={{ boxShadow: "0 4px 20px oklch(0.68 0.25 180 / 0.3)" }}
              data-ocid="register-prompt.primary_button"
            >
              Register Free
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-11 rounded-2xl font-display font-bold text-sm text-muted-foreground hover:text-foreground transition-smooth"
              data-ocid="register-prompt.close_button"
            >
              Not now
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
