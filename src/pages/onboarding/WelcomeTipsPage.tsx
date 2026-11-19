import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  Dices,
  Flame,
  Layers,
  MapPin,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";

const STEPS: { icon: ReactNode; title: string; description: string }[] = [
  {
    icon: <Dices className="w-10 h-10" />,
    title: "Draw a Card",
    description:
      "Each card reveals a bodyweight exercise and its rep count. No planning, just draw and move.",
  },
  {
    icon: <Layers className="w-10 h-10" />,
    title: "Choose Your Session",
    description:
      "Pick 10, 20, or 52 cards, or set a custom number. Short on time? Draw fewer cards.",
  },
  {
    icon: <Sparkles className="w-10 h-10" />,
    title: "Special Cards",
    description: "ACE doubles your reps. KING cuts them in half.",
  },
  {
    icon: <Zap className="w-10 h-10" />,
    title: "Joker Alert",
    description: "Joker cards trigger special bonus challenges. Dig deep!",
  },
  {
    icon: <Flame className="w-10 h-10" />,
    title: "Track Your Progress",
    description:
      "Every finished workout builds your streak and works towards achievements.",
  },
  {
    icon: <MapPin className="w-10 h-10" />,
    title: "Find a Park",
    description:
      "Open the map to find calisthenics parks near you, or add one you know.",
  },
  {
    icon: <Users className="w-10 h-10" />,
    title: "Train Together",
    description:
      "Invite friends to a live session and work through the same deck at the same time.",
  },
];

/** Step-by-step tour shown once to new users (after onboarding or a first
 * sign-in) and replayable from Profile → Help (?from=profile). */
export default function WelcomeTipsPage() {
  const navigate = useNavigate();
  const { from } = useSearch({ strict: false }) as { from?: string };
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  // Seen once per device, whichever way the user got here.
  useEffect(() => {
    localStorage.setItem("mbw_first_login", "done");
  }, []);

  const finish = () =>
    navigate({ to: from === "profile" ? "/profile" : "/home", replace: true });
  const next = () => (isLast ? finish() : setStep((s) => s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const current = STEPS[step];

  return (
    <div
      className="min-h-dvh flex flex-col max-w-[430px] mx-auto px-6 relative overflow-hidden bg-background"
      data-ocid="welcome-tips.page"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.22 0.04 var(--primary-h) / 0.2) 0%, transparent 55%)",
        }}
      />

      <div className="relative z-10 flex flex-col flex-1 pt-12 pb-10">
        <div className="flex items-center justify-between mb-8">
          <img
            src="/assets/images/mbw-logo-white-icon.webp"
            alt="MyBodyWeight"
            className="w-10 h-10 object-contain"
          />
          {!isLast && (
            <button
              type="button"
              onClick={finish}
              className="font-body text-sm font-bold text-white/50 hover:text-white transition-smooth"
              data-ocid="welcome-tips.skip_button"
            >
              Skip
            </button>
          )}
        </div>

        <h1 className="font-display font-black text-2xl uppercase tracking-widest-custom leading-none text-white text-center mb-10">
          How it works
        </h1>

        <div className="flex-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) next();
                else if (info.offset.x > 60) back();
              }}
              className="w-full rounded-3xl p-8 flex flex-col items-center text-center bg-card border border-primary/30 touch-pan-y"
              data-ocid={`welcome-tips.tip.${step + 1}`}
            >
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-primary/15 text-primary mb-6">
                {current.icon}
              </div>
              <h2 className="font-display font-bold text-white text-xl mb-3">
                {current.title}
              </h2>
              <p className="font-body text-sm text-white/60 leading-relaxed">
                {current.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex justify-center gap-2 my-8">
          <span className="sr-only" aria-live="polite">
            Step {step + 1} of {STEPS.length}
          </span>
          {STEPS.map((s, i) => (
            <span
              key={s.title}
              aria-hidden="true"
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : "w-2 bg-white/20"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={back}
              className="h-14 px-6 rounded-full font-display font-bold text-sm tracking-wide bg-card border border-border/60 text-white/70 transition-smooth hover:text-white"
              data-ocid="welcome-tips.back_button"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={next}
            className="flex-1 h-14 rounded-full flex items-center justify-center font-display font-bold text-sm tracking-wide bg-primary text-background transition-smooth hover:opacity-90 active:scale-[0.98]"
            data-ocid="welcome-tips.lets_go_button"
          >
            {isLast ? "Let's Go!" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
