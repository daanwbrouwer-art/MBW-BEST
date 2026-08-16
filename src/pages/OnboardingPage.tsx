import { ProgressBar } from "@/components/ProgressBar";
import { WeeklyGoalPicker } from "@/components/WeeklyGoalPicker";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_EQUIPMENT, useOnboarding } from "@/hooks/use-onboarding";
import { calculateBMI, getBMICategory } from "@/lib/calories";
import { setWeeklyGoal as setWeeklyGoalLib } from "@/lib/streak";
import { useWorkoutStore } from "@/store/workout";
import type { EquipmentProfile } from "@/types/user";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

const TOTAL_STEPS = 9;
const DEFAULT_WEEKLY_GOAL = 3;
const DEFAULT_WEIGHT_KG = 70;
const DEFAULT_AGE = 30;
const DEFAULT_HEIGHT_CM = 170;

const GENDERS = [
  { id: "male", label: "Male", sub: "Tailored for male athletes", icon: "♂" },
  {
    id: "female",
    label: "Female",
    sub: "Tailored for female athletes",
    icon: "♀",
  },
];

const GOALS = [
  { id: "Improve your body", icon: "🏃" },
  { id: "Build muscle", icon: "💪" },
  { id: "Burn fat", icon: "🔥" },
  { id: "Increase endurance", icon: "⚡" },
  { id: "Relieve stress", icon: "❤️" },
  { id: "Improve flexibility", icon: "🧘" },
];
const MAX_GOALS = 3;

const EQUIPMENT_TIERS = [
  {
    id: "Bodyweight",
    icon: "🏋️",
    desc: "No equipment needed. Train anywhere with just your body.",
  },
  {
    id: "Basic equipment",
    icon: "🔧",
    desc: "Elastics, parallettes. Simple tools that add variety.",
  },
  {
    id: "Advanced equipment",
    icon: "⚙️",
    desc: "Weighted vest, gymnastic rings. For serious progression.",
  },
];

const SELF_ASSESSMENTS = [
  "I am new to fitness.",
  "I need help getting back into a routine.",
  "I exercise often because it's good for me.",
  "I aim for excellence and advanced skills.",
  "I train for longevity and long-term health.",
];

const BMI_CATEGORY_LABELS: Record<string, string> = {
  underweight: "Underweight range",
  normal: "Healthy weight range",
  overweight: "Overweight range",
  obese: "Higher weight range",
};

function getBMICategoryLabel(bmi: number): string {
  return BMI_CATEGORY_LABELS[getBMICategory(bmi)];
}

function getFitnessLevelLabel(level: number): string {
  if (level <= 20) return "I rarely exercise";
  if (level <= 40) return "I exercise occasionally — once or twice a month";
  if (level <= 60) return "I exercise regularly — at least twice a week";
  if (level <= 80) return "I train seriously — 3 to 5 times a week";
  return "I train daily or near-daily with high intensity";
}

// Seeds a starting equipment profile from the equipment-tier picks — the
// user can fine-tune the exact 4 toggles anytime from Profile afterward.
function deriveEquipmentProfile(tiers: string[]): EquipmentProfile {
  const profile: EquipmentProfile = { ...DEFAULT_EQUIPMENT };
  if (tiers.includes("Basic equipment")) {
    profile.resistanceBandLong = true;
    profile.resistanceBandShort = true;
  }
  if (tiers.includes("Advanced equipment")) {
    profile.weightVest = true;
    profile.rings = true;
  }
  return profile;
}

// No shared backend to pull a real total from — use a documented stand-in
// base plus however many accounts actually exist in this browser.
function getAthleteCount(): number {
  try {
    const raw = localStorage.getItem("mbw_accounts_db");
    const localAccounts = raw ? Object.keys(JSON.parse(raw)).length : 0;
    return 1200 + localAccounts;
  } catch {
    return 1247;
  }
}

const infoCardStyle = {
  background: "oklch(0.17 0.04 180 / 0.35)",
  border: "1px solid oklch(0.68 0.25 180 / 0.25)",
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { saveOnboarding } = useOnboarding();
  const guestMode = useWorkoutStore((s) => s.guestMode);

  const [step, setStep] = useState(1);
  const [gender, setGender] = useState("");
  const [weightKg, setWeightKg] = useState(DEFAULT_WEIGHT_KG);
  const [age, setAge] = useState(DEFAULT_AGE);
  const [heightCm, setHeightCm] = useState(DEFAULT_HEIGHT_CM);
  const [bodyMetricsTouched, setBodyMetricsTouched] = useState(false);
  const [goals, setGoals] = useState<string[]>([]);
  const [fitnessLevel, setFitnessLevel] = useState(0);
  const [fitnessTouched, setFitnessTouched] = useState(false);
  const [equipmentAccess, setEquipmentAccess] = useState<string[]>([]);
  const [selfAssessment, setSelfAssessment] = useState("");
  const [weeklyGoal, setWeeklyGoal] = useState(DEFAULT_WEEKLY_GOAL);

  const toggleGoal = (id: string) => {
    setGoals((prev) => {
      if (prev.includes(id)) return prev.filter((g) => g !== id);
      if (prev.length >= MAX_GOALS) return prev;
      return [...prev, id];
    });
  };

  const toggleEquipment = (id: string) => {
    setEquipmentAccess((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
  };

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));

  const goBack = () => {
    if (step === 1) {
      navigate({ to: "/onboarding/welcome" });
      return;
    }
    setStep((s) => s - 1);
  };

  const handleComplete = async () => {
    await saveOnboarding({
      gender,
      weightKg,
      age,
      heightCm,
      goals,
      fitnessLevel,
      equipmentAccess,
      selfAssessment,
      equipment: deriveEquipmentProfile(equipmentAccess),
      hasCompletedOnboarding: true,
      completedAt: Date.now(),
    });
    const isEmailAuth = localStorage.getItem("mbw_user") !== null;
    setWeeklyGoalLib(guestMode && !isEmailAuth, weeklyGoal);
    navigate({ to: "/home" });
  };

  const canProceed = (() => {
    switch (step) {
      case 1:
        return !!gender;
      case 2:
        return bodyMetricsTouched;
      case 3:
        return goals.length >= 1;
      case 4:
        return true;
      case 5:
        return fitnessTouched;
      case 6:
        return equipmentAccess.length >= 1;
      case 7:
        return !!selfAssessment;
      case 8:
        return weeklyGoal >= 1 && weeklyGoal <= 7;
      case 9:
        return true;
      default:
        return false;
    }
  })();

  const handleNext = () => {
    if (!canProceed) return;
    if (step === TOTAL_STEPS) {
      handleComplete();
    } else {
      goNext();
    }
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col relative overflow-hidden max-w-[430px] mx-auto">
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(ellipse, oklch(0.68 0.25 180) 0%, transparent 70%)",
        }}
      />

      <header className="relative z-10 flex items-center gap-3 px-5 pt-12 pb-5">
        <button
          type="button"
          onClick={goBack}
          className="w-10 h-10 rounded-xl bg-card border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/45 transition-smooth shrink-0"
          data-ocid="onboarding-flow.back_button"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <ProgressBar current={step} total={TOTAL_STEPS} className="flex-1" />
      </header>

      <div className="flex-1 flex flex-col px-6 pb-6 relative z-10">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 flex flex-col"
        >
          {step === 1 && <GenderStep gender={gender} onSelect={setGender} />}
          {step === 2 && (
            <BodyMetricsStep
              weightKg={weightKg}
              age={age}
              heightCm={heightCm}
              touched={bodyMetricsTouched}
              onChangeWeight={(v) => {
                setWeightKg(v);
                setBodyMetricsTouched(true);
              }}
              onChangeAge={(v) => {
                setAge(v);
                setBodyMetricsTouched(true);
              }}
              onChangeHeight={(v) => {
                setHeightCm(v);
                setBodyMetricsTouched(true);
              }}
            />
          )}
          {step === 3 && <GoalsStep goals={goals} onToggle={toggleGoal} />}
          {step === 4 && <MotivationStep onAutoAdvance={goNext} />}
          {step === 5 && (
            <FitnessLevelStep
              level={fitnessLevel}
              touched={fitnessTouched}
              onChange={(v) => {
                setFitnessLevel(v);
                setFitnessTouched(true);
              }}
            />
          )}
          {step === 6 && (
            <EquipmentStep
              selected={equipmentAccess}
              onToggle={toggleEquipment}
            />
          )}
          {step === 7 && (
            <SelfAssessmentStep
              selected={selfAssessment}
              onSelect={setSelfAssessment}
            />
          )}
          {step === 8 && (
            <WeeklyGoalStep value={weeklyGoal} onChange={setWeeklyGoal} />
          )}
          {step === 9 && <AiCoachStep onAutoAdvance={handleComplete} />}
        </motion.div>
      </div>

      <div className="px-6 pb-10 relative z-10">
        <button
          type="button"
          onClick={handleNext}
          disabled={!canProceed}
          data-ocid="onboarding-flow.next_button"
          className={`w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all duration-300 ${
            canProceed
              ? "bg-primary text-background shadow-[0_4px_20px_oklch(0.68_0.25_180_/_0.4)] hover:shadow-[0_6px_28px_oklch(0.68_0.25_180_/_0.55)] active:scale-[0.98]"
              : "bg-muted text-muted-foreground cursor-not-allowed opacity-40"
          }`}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ─── Step 1 — Gender ──────────────────────────────────────────────────────

function GenderStep({
  gender,
  onSelect,
}: {
  gender: string;
  onSelect: (g: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">
          Get Started
        </p>
        <h1 className="text-3xl font-display font-black text-foreground mb-2 leading-tight">
          Welcome to
          <br />
          <span className="text-primary">MyBodyWeight</span>
        </h1>
        <p className="text-muted-foreground text-sm">Tell us about yourself</p>
      </div>

      <div className="w-full grid grid-cols-2 gap-4">
        {GENDERS.map((g) => (
          <button
            key={g.id}
            type="button"
            data-ocid={`onboarding-flow.gender_${g.id}`}
            onClick={() => onSelect(g.id)}
            className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl p-6 border transition-all duration-300 ${
              gender === g.id
                ? "border-primary bg-primary/10 shadow-[0_0_20px_oklch(0.68_0.25_180_/_0.25)]"
                : "border-border bg-card hover:border-primary/40 hover:bg-card/80"
            }`}
          >
            {gender === g.id && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check
                  className="w-3 h-3"
                  style={{ color: "oklch(0.08 0.005 260)" }}
                  strokeWidth={3}
                />
              </div>
            )}
            <span className="text-5xl">{g.icon}</span>
            <div className="text-center">
              <p className="text-base font-bold text-foreground">{g.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{g.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2 — Body metrics (weight + age) ─────────────────────────────────
// Feeds the per-exercise calorie calculator (src/lib/calories.ts) so both
// the pre-workout estimate and the post-workout summary scale to the
// user's actual body weight instead of a flat assumed default.

function BodyMetricsStep({
  weightKg,
  age,
  heightCm,
  touched,
  onChangeWeight,
  onChangeAge,
  onChangeHeight,
}: {
  weightKg: number;
  age: number;
  heightCm: number;
  touched: boolean;
  onChangeWeight: (v: number) => void;
  onChangeAge: (v: number) => void;
  onChangeHeight: (v: number) => void;
}) {
  const bmi = calculateBMI(weightKg, heightCm);

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-display font-black text-foreground mb-2">
          A bit about your body
        </h1>
        <p className="text-sm text-muted-foreground">
          We use this to calculate your BMI and a more accurate calorie burn
          for every workout.
        </p>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-7">
        <div className="w-full px-2">
          <p className="text-center text-sm font-medium text-primary mb-4">
            {touched ? `${weightKg} kg` : "👆 Slide to set your weight"}
          </p>
          <Slider
            value={[weightKg]}
            onValueChange={([v]) => onChangeWeight(v)}
            min={30}
            max={180}
            step={1}
            data-ocid="onboarding-flow.weight_slider"
          />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">30 kg</span>
            <span className="text-xs text-muted-foreground">180 kg</span>
          </div>
        </div>
        <div className="w-full px-2">
          <p className="text-center text-sm font-medium text-primary mb-4">
            {touched ? `${heightCm} cm` : "👆 Slide to set your height"}
          </p>
          <Slider
            value={[heightCm]}
            onValueChange={([v]) => onChangeHeight(v)}
            min={130}
            max={220}
            step={1}
            data-ocid="onboarding-flow.height_slider"
          />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">130 cm</span>
            <span className="text-xs text-muted-foreground">220 cm</span>
          </div>
        </div>
        <div className="w-full px-2">
          <p className="text-center text-sm font-medium text-primary mb-4">
            {touched ? `${age} years old` : "👆 Slide to set your age"}
          </p>
          <Slider
            value={[age]}
            onValueChange={([v]) => onChangeAge(v)}
            min={13}
            max={90}
            step={1}
            data-ocid="onboarding-flow.age_slider"
          />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">13</span>
            <span className="text-xs text-muted-foreground">90</span>
          </div>
        </div>
        {touched && (
          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={infoCardStyle}
            data-ocid="onboarding-flow.bmi_readout"
          >
            <div>
              <p className="text-xs text-muted-foreground">Your BMI</p>
              <p className="text-sm font-bold text-foreground">
                {getBMICategoryLabel(bmi)}
              </p>
            </div>
            <p className="text-2xl font-display font-black text-primary tabular-nums">
              {bmi.toFixed(1)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 3 — Goals ───────────────────────────────────────────────────────

function GoalsStep({
  goals,
  onToggle,
}: {
  goals: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-display font-black text-foreground mb-3">
          What are your main goals?
        </h1>
        <div
          className="rounded-xl px-4 py-3 flex items-start gap-2.5"
          style={infoCardStyle}
        >
          <span className="text-base">🚀</span>
          <p className="text-sm text-foreground/90">
            Think about what you want to achieve. Select up to three options.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {GOALS.map((g) => {
          const idx = goals.indexOf(g.id);
          const selected = idx !== -1;
          const dimmed = !selected && goals.length >= MAX_GOALS;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onToggle(g.id)}
              disabled={dimmed}
              data-ocid={`onboarding-flow.goal_${g.id}`}
              className={`relative flex items-center gap-4 rounded-2xl p-4 border text-left transition-all duration-300 ${
                selected
                  ? "border-primary bg-primary/10 shadow-[0_0_20px_oklch(0.68_0.25_180_/_0.2)]"
                  : dimmed
                    ? "border-border/40 bg-card/40 opacity-40 cursor-not-allowed"
                    : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span className="text-2xl shrink-0">{g.icon}</span>
              <span className="flex-1 font-bold text-sm text-foreground">
                {g.id}
              </span>
              {selected && (
                <span className="w-6 h-6 rounded-full bg-primary text-background flex items-center justify-center text-xs font-black shrink-0">
                  {idx + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 4 — Motivation interstitial ─────────────────────────────────────

function MotivationStep({ onAutoAdvance }: { onAutoAdvance: () => void }) {
  const target = useMemo(() => getAthleteCount(), []);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let raf: number;
    const duration = 2000;
    const start = performance.now();
    const easeOutQuart = (t: number) => 1 - (1 - t) ** 4;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setCount(Math.round(easeOutQuart(t) * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  useEffect(() => {
    const timer = setTimeout(onAutoAdvance, 3000);
    return () => clearTimeout(timer);
  }, [onAutoAdvance]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-display font-black text-foreground"
      >
        Alright, let's get fit! 🎉
      </motion.h1>
      <p className="text-muted-foreground text-sm mt-2">We've helped</p>
      <p className="text-5xl font-display font-black text-primary tabular-nums">
        {count.toLocaleString()}
      </p>
      <p className="text-muted-foreground text-sm max-w-xs">
        Free Athletes get fit so far. Welcome to the team.
      </p>
    </div>
  );
}

// ─── Step 5 — Fitness level ───────────────────────────────────────────────

function FitnessLevelStep({
  level,
  touched,
  onChange,
}: {
  level: number;
  touched: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex-1 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-display font-black text-foreground mb-2">
          What is your fitness level?
        </h1>
        <p className="text-sm text-muted-foreground">
          Select the option that most closely matches you.
        </p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <p className="text-center text-sm font-medium text-primary min-h-[2.5rem] flex items-center px-4">
          {touched ? getFitnessLevelLabel(level) : "👆 Slide to choose"}
        </p>
        <div className="w-full px-2">
          <Slider
            value={[level]}
            onValueChange={([v]) => onChange(v)}
            min={0}
            max={100}
            step={1}
            data-ocid="onboarding-flow.fitness_slider"
          />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              Not fit at all
            </span>
            <span className="text-xs text-muted-foreground">Really fit</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 6 — Equipment access ────────────────────────────────────────────

function EquipmentStep({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-display font-black text-foreground mb-2">
          What equipment do you have access to?
        </h1>
        <p className="text-sm text-muted-foreground">
          This helps us recommend the right starting deck. Select all that
          apply.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {EQUIPMENT_TIERS.map((eq) => {
          const idx = selected.indexOf(eq.id);
          const isSelected = idx !== -1;
          return (
            <button
              key={eq.id}
              type="button"
              onClick={() => onToggle(eq.id)}
              data-ocid={`onboarding-flow.equipment_${eq.id}`}
              className={`relative flex items-center gap-4 rounded-2xl p-4 border text-left transition-all duration-300 ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-[0_0_20px_oklch(0.68_0.25_180_/_0.2)]"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: "oklch(0.18 0.015 180 / 0.5)" }}
              >
                {eq.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground">{eq.id}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  {eq.desc}
                </p>
              </div>
              {isSelected && (
                <span className="w-6 h-6 rounded-full bg-primary text-background flex items-center justify-center text-xs font-black shrink-0">
                  {idx + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 7 — Self-assessment ─────────────────────────────────────────────

function SelfAssessmentStep({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-display font-black text-foreground mb-3">
          Which statement best describes you?
        </h1>
        <div
          className="rounded-xl px-4 py-3 flex items-start gap-2.5"
          style={infoCardStyle}
        >
          <span className="text-base">🏆</span>
          <p className="text-sm text-foreground/90">
            Help us understand your current relationship with fitness.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {SELF_ASSESSMENTS.map((s) => {
          const isSelected = selected === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onSelect(s)}
              data-ocid="onboarding-flow.self_assessment_option"
              className={`rounded-2xl p-4 border text-left transition-all duration-300 ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-[0_0_20px_oklch(0.68_0.25_180_/_0.2)]"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <p className="text-sm font-medium text-foreground">{s}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 8 — Weekly training goal ────────────────────────────────────────

function WeeklyGoalStep({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex-1 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-display font-black text-foreground mb-3">
          How many days a week do you want to train?
        </h1>
        <div
          className="rounded-xl px-4 py-3 flex items-start gap-2.5"
          style={infoCardStyle}
        >
          <span className="text-base">🔥</span>
          <p className="text-sm text-foreground/90">
            This becomes your weekly streak goal — hit it every week to keep
            your streak alive. You can always adjust it later in Settings.
          </p>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-6">
        <WeeklyGoalPicker value={value} onChange={onChange} />
        <p className="text-center text-sm font-medium text-primary">
          {value} {value === 1 ? "day" : "days"} a week
        </p>
      </div>
    </div>
  );
}

// ─── Step 9 — AI Coach chart ──────────────────────────────────────────────

function AiCoachStep({ onAutoAdvance }: { onAutoAdvance: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onAutoAdvance, 2500);
    return () => clearTimeout(timer);
  }, [onAutoAdvance]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-display font-black text-foreground"
      >
        Your AI Coach is designing your plan…
      </motion.h1>

      <div className="w-full max-w-xs">
        <svg
          viewBox="0 0 300 180"
          className="w-full h-auto"
          role="img"
          aria-label="Projected fitness progress chart"
        >
          <title>
            Projected fitness progress with vs. without MyBodyWeight
          </title>
          <line
            x1="20"
            y1="150"
            x2="20"
            y2="10"
            stroke="oklch(0.32 0.01 260)"
            strokeWidth="1"
          />
          <line
            x1="20"
            y1="150"
            x2="280"
            y2="150"
            stroke="oklch(0.32 0.01 260)"
            strokeWidth="1"
          />
          <text
            x="150"
            y="170"
            textAnchor="middle"
            fill="oklch(0.55 0.008 260)"
            fontSize="9"
          >
            Time
          </text>
          <text
            x="8"
            y="80"
            textAnchor="middle"
            transform="rotate(-90 8 80)"
            fill="oklch(0.55 0.008 260)"
            fontSize="9"
          >
            Fitness
          </text>

          <line
            x1="280"
            y1="10"
            x2="280"
            y2="150"
            stroke="oklch(0.4 0.01 260)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          <path
            d="M20,130 Q150,125 270,120"
            stroke="oklch(0.45 0.008 260)"
            strokeWidth="2"
            fill="none"
          />
          <circle cx="270" cy="120" r="4" fill="oklch(0.45 0.008 260)" />
          <text x="30" y="145" fontSize="8" fill="oklch(0.6 0.008 260)">
            You without MyBodyWeight
          </text>

          <motion.path
            d="M20,140 C100,130 180,60 270,20"
            stroke="white"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
          <motion.circle
            cx="270"
            cy="20"
            r="5"
            fill="oklch(0.68 0.25 180)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.9 }}
          />
          <text x="30" y="35" fontSize="8" fill="white" fontWeight="bold">
            You with MyBodyWeight
          </text>
        </svg>
        <p className="text-xs text-white/70 mt-2">
          Get better results, faster.
        </p>
      </div>

      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.2,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}
