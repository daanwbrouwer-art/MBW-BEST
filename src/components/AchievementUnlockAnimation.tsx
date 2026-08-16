import type { Achievement } from "@/types/achievements";
import { CATEGORY_META, RARITY_CONFIG } from "@/types/achievements";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

interface AchievementUnlockAnimationProps {
  achievement: Achievement;
  onComplete: () => void;
}

export function AchievementUnlockAnimation({
  achievement,
  onComplete,
}: AchievementUnlockAnimationProps) {
  const config = RARITY_CONFIG[achievement.rarity];
  const category = CATEGORY_META[achievement.category];
  const [phase, setPhase] = useState<"enter" | "hold" | "flying">("enter");

  // "Flying" (shrink + fly to the nav bar's Achievements icon, like coins
  // flying to a wallet) always takes the same 550ms regardless of rarity —
  // only the hold duration scales with rarity.
  const flyDuration = 550;
  const durations: Record<string, number> = {
    common: 2000,
    uncommon: 2500,
    rare: 3000,
    epic: 3500,
    legendary: 4000,
  };
  const totalDuration = (durations[achievement.rarity] ?? 2000) + flyDuration;
  const holdDuration = totalDuration - flyDuration;

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase("hold"), 400);
    const flyTimer = setTimeout(() => setPhase("flying"), holdDuration);
    const doneTimer = setTimeout(() => onComplete(), totalDuration);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(flyTimer);
      clearTimeout(doneTimer);
    };
  }, [holdDuration, totalDuration, onComplete]);

  const isLegendary = achievement.rarity === "legendary";
  const isEpic = achievement.rarity === "epic";
  const isRare = achievement.rarity === "rare";
  const isFlying = phase === "flying";

  // Achievements is the middle icon of BottomNav's 5 evenly-spaced items,
  // so its center sits at 50% of viewport width — the card is already
  // horizontally centered, it just needs to travel down to the nav bar.
  const flyTarget = { y: "40vh", x: 0, scale: 0.12, opacity: 0, rotate: 8 };

  return (
    <AnimatePresence>
      <motion.div
        key="achievement-unlock-overlay"
        className={`fixed inset-0 z-[100] flex items-center justify-center${
          isFlying ? " pointer-events-none" : ""
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: isFlying ? 0.4 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: isFlying ? flyDuration / 1000 : 0.3 }}
      >
        {/* Epic screen flash */}
        {isEpic && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{ background: config.glowColor }}
          />
        )}

        {/* Legendary dim + gold particles */}
        {isLegendary && (
          <>
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.75 }}
              transition={{ duration: 0.4 }}
              style={{ background: "oklch(0.05 0.005 260)" }}
            />
            {/* Gold particles */}
            {Array.from({ length: 24 }, (_, i) => `particle-fall-${i}`).map(
              (key) => (
                <motion.div
                  key={key}
                  className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
                  style={{
                    background: config.glowColor,
                    left: `${Math.random() * 100}%`,
                  }}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{
                    y: "110vh",
                    opacity: [0, 1, 1, 0],
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 1.5,
                    delay: Math.random() * 0.8,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeOut",
                  }}
                />
              ),
            )}
          </>
        )}

        {/* Universal teal particle burst on landing — every rarity gets this, on top of its own flourish above. */}
        {phase !== "enter" && !isFlying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {Array.from({ length: 14 }, (_, i) => i).map((i) => {
              const angle = (i / 14) * Math.PI * 2;
              const dist = 90 + (i % 3) * 20;
              const dx = Math.cos(angle) * dist;
              const dy = Math.sin(angle) * dist;
              return (
                <motion.div
                  key={`teal-burst-${i}`}
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{ background: "#1AD6A0" }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: dx, y: dy, opacity: 0, scale: 0.3 }}
                  transition={{
                    duration: 0.7,
                    delay: i * 0.02,
                    ease: "easeOut",
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Rare particle burst */}
        {isRare && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {Array.from({ length: 16 }, (_, i) => i).map((i) => {
              const angle = (i / 16) * Math.PI * 2;
              const dx = Math.cos(angle) * 120;
              const dy = Math.sin(angle) * 120;
              return (
                <motion.div
                  key={`burst-${i}`}
                  className="absolute w-2 h-2 rounded-full"
                  style={{ background: config.glowColor }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: dx,
                    y: dy,
                    opacity: 0,
                    scale: 0.2,
                  }}
                  transition={{
                    duration: 0.8,
                    delay: 0.2 + i * 0.03,
                    ease: "easeOut",
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Main achievement card — flies in from the bottom, flips once, lands center; on the way out it shrinks and flies down toward the Achievements icon in the nav bar. */}
        <motion.div
          className="relative z-10 w-full max-w-sm mx-6 rounded-3xl p-8 text-center"
          style={{
            background: "oklch(0.14 0.02 260 / 0.95)",
            border: `2px solid ${config.glowColor}50`,
            boxShadow: `0 0 60px ${config.glowColor}30, 0 0 120px ${config.glowColor}15`,
            perspective: 1000,
          }}
          initial={{ y: 260, opacity: 0, scale: 0.8, rotateY: -110 }}
          animate={
            isFlying ? flyTarget : { y: 0, opacity: 1, scale: 1, rotateY: 0 }
          }
          transition={
            isFlying
              ? { duration: flyDuration / 1000, ease: [0.5, 0, 1, 1] }
              : {
                  type: isLegendary ? "spring" : "tween",
                  stiffness: 300,
                  damping: 20,
                  duration: 0.55,
                  ease: [0.34, 1.56, 0.64, 1],
                }
          }
        >
          {/* Legendary pulsing aura rings */}
          {isLegendary && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    border: `2px solid ${config.glowColor}`,
                  }}
                  initial={{ width: 200, height: 200, opacity: 0.6 }}
                  animate={{
                    width: 500,
                    height: 500,
                    opacity: 0,
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.5,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeOut",
                  }}
                />
              ))}
            </div>
          )}

          {/* Legendary waveform pulse */}
          {isLegendary && (
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-0.5 pointer-events-none">
              {Array.from({ length: 12 }, (_, i) => `wave-${i}`).map(
                (key, i) => (
                  <motion.div
                    key={key}
                    className="w-1 rounded-full"
                    style={{ background: config.glowColor }}
                    animate={{
                      height: [8, 24 + Math.random() * 16, 8],
                      opacity: [0.4, 0.9, 0.4],
                    }}
                    transition={{
                      duration: 0.6 + Math.random() * 0.4,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: i * 0.08,
                      ease: "easeInOut",
                    }}
                  />
                ),
              )}
            </div>
          )}

          {/* Shine sweep for uncommon */}
          {achievement.rarity === "uncommon" && (
            <motion.div
              className="absolute inset-0 rounded-3xl pointer-events-none overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ duration: 1.2, delay: 0.3 }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)",
                  transform: "translateX(-100%)",
                  animation: "shineSweep 1.2s ease-in-out 0.3s forwards",
                }}
              />
            </motion.div>
          )}

          {/* Category emoji */}
          <motion.div
            className="text-5xl mb-3"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 15,
              delay: 0.15,
            }}
          >
            {category.emoji}
          </motion.div>

          {/* Unlocked text */}
          <motion.p
            className="font-display font-black text-xs uppercase tracking-[0.3em] mb-2"
            style={{ color: config.glowColor }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            ACHIEVEMENT UNLOCKED
          </motion.p>

          {/* Achievement name */}
          <motion.h2
            className="font-display font-black text-2xl text-foreground mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {achievement.name}
          </motion.h2>

          {/* Rarity badge */}
          <motion.span
            className="inline-block text-[11px] font-display font-black uppercase tracking-wider px-3 py-1 rounded-full mb-3"
            style={{
              background: `${config.glowColor}20`,
              color: config.glowColor,
              border: `1px solid ${config.glowColor}40`,
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            {config.label}
          </motion.span>

          {/* Description */}
          <motion.p
            className="text-sm text-muted-foreground font-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {achievement.description}
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
