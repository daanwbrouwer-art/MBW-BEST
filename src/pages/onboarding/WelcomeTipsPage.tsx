import { useNavigate } from "@tanstack/react-router";
import { Dices, Layers, Sparkles, Zap } from "lucide-react";
import { motion } from "motion/react";

export default function WelcomeTipsPage() {
  const navigate = useNavigate();

  const tips = [
    {
      icon: <Dices className="w-6 h-6" />,
      title: "Draw a Card",
      description: "Each card reveals a bodyweight exercise and rep count.",
    },
    {
      icon: <Layers className="w-6 h-6" />,
      title: "Choose Your Session",
      description: "Pick 10, 20, or 52 cards — or set a custom number.",
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Special Cards",
      description: "ACE doubles your reps. KING cuts them in half.",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Joker Alert",
      description: "Joker cards trigger special bonus challenges. Dig deep!",
    },
  ];

  return (
    <div
      className="min-h-dvh flex flex-col max-w-[430px] mx-auto px-6 relative overflow-hidden bg-background"
      data-ocid="welcome-tips.page"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.22 0.04 180 / 0.2) 0%, transparent 55%)",
        }}
      />

      <div className="relative z-10 flex flex-col flex-1 pt-16 pb-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <img
            src="/assets/images/mbw-logo-white-icon.png"
            alt="MyBodyWeight"
            className="w-14 h-14 object-contain"
            style={{
              filter: "drop-shadow(0 0 10px oklch(0.68 0.25 180 / 0.3))",
            }}
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="font-display font-black text-3xl uppercase tracking-widest-custom leading-none text-white text-center mb-10"
        >
          Welcome to MyBodyWeight!
        </motion.h1>

        <div className="flex flex-col gap-4 mb-8">
          {tips.map((tip, index) => (
            <motion.div
              key={tip.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
              className="rounded-2xl p-5 flex items-start gap-4 bg-card border-l-[3px] border-primary"
              data-ocid={`welcome-tips.tip.${index + 1}`}
            >
              <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-primary/15 text-primary">
                {tip.icon}
              </div>
              <div>
                <h3 className="font-display font-bold text-white text-base mb-1">
                  {tip.title}
                </h3>
                <p className="font-body text-sm text-white/55 leading-relaxed">
                  {tip.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="mt-auto"
        >
          <button
            type="button"
            onClick={() => navigate({ to: "/home" })}
            className="w-full h-14 rounded-full flex items-center justify-center font-display font-bold text-sm tracking-wide bg-primary text-background transition-smooth hover:opacity-90 active:scale-[0.98]"
            data-ocid="welcome-tips.lets_go_button"
          >
            Let's Go!
          </button>
        </motion.div>
      </div>
    </div>
  );
}
