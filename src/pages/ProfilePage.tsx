import { Logo } from "@/components/Logo";
import { WeeklyGoalPicker } from "@/components/WeeklyGoalPicker";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useEquipmentTier } from "@/hooks/use-equipment-tier";
import { useInternetIdentity } from "@/hooks/use-local-identity";
import {
  type NotificationSettings,
  useNotifications,
} from "@/hooks/use-notifications";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useProfile } from "@/hooks/use-profile";
import { useStreak } from "@/hooks/use-streak";
import { useTier } from "@/hooks/use-tier";
import { useWorkoutHistory } from "@/hooks/use-workout-history";
import { readChallengeHistory } from "@/lib/challenge";
import { openPrivacyPolicy, openTermsOfUse } from "@/lib/legal";
import {
  computeDiscountPct,
  ensureReferralCode,
  getCurrentEmail,
  getReferralRecord,
} from "@/lib/referral";
import {
  type MessagingPreference,
  getMessagingPreference,
  setDiscoverable,
  setMessagingPreference,
} from "@/lib/remoteBackend";
import { CHALLENGE_TYPE_EMOJI } from "@/types/challenge";
import type { EquipmentTier } from "@/types/equipment";
import { getTier as getSubscriptionTier } from "@/types/subscription";
import type { EquipmentProfile } from "@/types/user";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Clock,
  Copy,
  Dumbbell,
  FileText,
  Flame,
  Gift,
  Lock,
  LogOut,
  MessageCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

const EQUIPMENT_ITEMS: {
  key: keyof EquipmentProfile;
  label: string;
  description: string;
}[] = [
  {
    key: "weightVest",
    label: "Weight Vest",
    description: "Adds resistance to push-ups, pull-ups, dips & squats",
  },
  {
    key: "resistanceBandLong",
    label: "Long Resistance Band",
    description: "For assisted pull-ups, stretching & warm-up",
  },
  {
    key: "resistanceBandShort",
    label: "Short Resistance Band",
    description: "For lateral walks, glute activation & rehab",
  },
  {
    key: "rings",
    label: "Rings",
    description: "For ring dips, ring rows, ring push-ups & muscle-ups",
  },
];

// Equipment tier drives the easier/harder suggestion chips shown on every
// workout card (src/components/EquipmentSuggestionChips.tsx) — separate
// from the granular per-item toggles below (EQUIPMENT_ITEMS), which drive
// card auto-substitution instead.
const EQUIPMENT_TIER_OPTIONS: {
  value: EquipmentTier;
  label: string;
  subtitle: string;
}[] = [
  { value: "bodyweight", label: "Bodyweight", subtitle: "No equipment" },
  { value: "basic", label: "Basic", subtitle: "Parallel bars + elastics" },
  { value: "advanced", label: "Advanced", subtitle: "+ Vest + rings" },
];

const NOTIFICATION_ITEMS: {
  key: keyof Omit<NotificationSettings, "enabled">;
  label: string;
  description: string;
}[] = [
  {
    key: "reminders",
    label: "Training reminders",
    description: "Get reminded to train on your scheduled days",
  },
  {
    key: "weeklySummary",
    label: "Weekly summary",
    description: "Receive your weekly stats every Sunday",
  },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { loginStatus, clear } = useInternetIdentity();
  const isLoggedIn = loginStatus === "success";

  const { data: profile } = useProfile();
  const [isTogglingDiscoverable, setIsTogglingDiscoverable] = useState(false);
  const { data: messagingPreference } = useQuery({
    queryKey: ["messaging-preference"],
    queryFn: getMessagingPreference,
    enabled: isLoggedIn,
  });
  const [isSavingMessagingPreference, setIsSavingMessagingPreference] =
    useState(false);
  const { data: history } = useWorkoutHistory();
  const { equipment, saveOnboarding } = useOnboarding();
  const { tier: equipmentTier, setTier: setEquipmentTier } = useEquipmentTier();
  const {
    settings: notificationSettings,
    browserPermission,
    toggle: toggleNotification,
  } = useNotifications();
  const { streak, setWeeklyGoal } = useStreak();
  const { subscription, effectiveTier } = useTier();
  const challengeHistory =
    effectiveTier === "subscriber" ? readChallengeHistory() : [];
  const email = getCurrentEmail();
  const referralCode = email ? ensureReferralCode(email) : null;
  const referralRecord = email ? getReferralRecord(email) : null;
  const referralDiscountPct = computeDiscountPct(referralRecord);

  const handleCopyReferralCode = async () => {
    if (!referralCode) return;
    const message = `Join me on MyBodyWeight and get 10% off your first payment! Use my code ${referralCode} when you sign up.`;
    try {
      await navigator.clipboard.writeText(message);
      toast("Copied!", {
        description: "Your referral message is ready to share.",
        duration: 3000,
      });
    } catch {
      toast("Your referral code", {
        description: referralCode,
        duration: 4000,
      });
    }
  };

  const handleLogout = () => {
    clear();
    localStorage.removeItem("mbw_user");
    localStorage.removeItem("mbw_first_login");
    navigate({ to: "/onboarding/welcome" });
  };

  const handleToggleEquipment = (key: keyof EquipmentProfile) => {
    saveOnboarding({ equipment: { ...equipment, [key]: !equipment[key] } });
  };

  const handleRetakeAssessment = async () => {
    await saveOnboarding({ hasCompletedOnboarding: false });
    navigate({ to: "/onboarding" });
  };

  const handleToggleDiscoverable = async (next: boolean) => {
    setIsTogglingDiscoverable(true);
    try {
      const result = await setDiscoverable(next);
      if (!result.ok) {
        toast("Couldn't update visibility", { description: result.error });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } finally {
      setIsTogglingDiscoverable(false);
    }
  };

  const handleSetMessagingPreference = async (
    preference: MessagingPreference,
  ) => {
    setIsSavingMessagingPreference(true);
    try {
      const result = await setMessagingPreference(preference);
      if (!result.ok) {
        toast("Couldn't update messaging preference", {
          description: result.error,
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["messaging-preference"] });
    } finally {
      setIsSavingMessagingPreference(false);
    }
  };

  const totalWorkouts = profile?.totalWorkouts ?? BigInt(0);
  const totalCalories = profile?.totalCalories ?? BigInt(0);
  const totalReps = history
    ? history.reduce((sum, h) => sum + Number(h.totalReps), 0)
    : 0;

  return (
    <div
      className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto"
      data-ocid="profile.page"
    >
      {/* Radial gradient */}
      <div
        className="absolute inset-0 pointer-events-none max-w-[430px] mx-auto"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.22 0.04 180 / 0.22) 0%, transparent 60%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4">
        <button
          type="button"
          className="w-9 h-9 rounded-xl bg-card/80 border border-border/60 flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-smooth"
          onClick={() => navigate({ to: "/home" })}
          data-ocid="profile.back_button"
          aria-label="Go back to home"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Logo size="sm" showIcon />
        {isLoggedIn ? (
          <button
            type="button"
            className="w-9 h-9 rounded-xl bg-card/80 border border-border/60 flex items-center justify-center text-muted-foreground hover:border-destructive/50 hover:text-destructive transition-smooth"
            onClick={handleLogout}
            data-ocid="profile.logout_button"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-9" />
        )}
      </header>

      <div className="relative z-10 flex flex-col flex-1 px-5 pb-10">
        {/* Avatar + name */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center pt-4 pb-8"
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{
              background: "oklch(0.17 0.015 180 / 0.3)",
              border: "2px solid oklch(0.68 0.25 180 / 0.4)",
              boxShadow: "0 0 40px oklch(0.68 0.25 180 / 0.18)",
            }}
          >
            <User
              className="w-9 h-9"
              style={{ color: "oklch(0.68 0.25 180)" }}
            />
          </div>
          <h1 className="font-display font-black text-2xl text-foreground mb-1">
            {profile?.username ?? (isLoggedIn ? "Athlete" : "Guest")}
          </h1>
          <span
            className="text-[11px] font-display font-bold px-3 py-1 rounded-full"
            style={{
              background: isLoggedIn
                ? "oklch(0.68 0.25 180 / 0.12)"
                : "oklch(0.28 0.01 260 / 0.6)",
              color: isLoggedIn
                ? "oklch(0.68 0.25 180)"
                : "oklch(0.62 0.008 260)",
              border: isLoggedIn
                ? "1px solid oklch(0.68 0.25 180 / 0.25)"
                : "1px solid oklch(0.32 0.01 260 / 0.5)",
            }}
          >
            {isLoggedIn ? "REGISTERED" : "GUEST MODE"}
          </span>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.45 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          {[
            {
              icon: <Dumbbell className="w-4 h-4" />,
              label: "Workouts",
              value: totalWorkouts.toString(),
            },
            {
              icon: <Flame className="w-4 h-4" />,
              label: "Calories",
              value: totalCalories.toString(),
            },
            {
              icon: <Clock className="w-4 h-4" />,
              label: "Total Reps",
              value: totalReps.toString(),
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="rounded-2xl p-3.5 flex flex-col items-center gap-1.5 text-center"
              style={{
                background: "oklch(0.16 0.01 260)",
                border: "1px solid oklch(0.26 0.01 260 / 0.6)",
              }}
              data-ocid={`profile.stat.item.${i + 1}`}
            >
              <span style={{ color: "oklch(0.68 0.25 180)" }}>{stat.icon}</span>
              <p className="font-display font-black text-xl text-foreground leading-none">
                {stat.value}
              </p>
              <p className="text-[10px] font-body text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Equipment Tier — segmented control driving the workout-card
            suggestion chips. Distinct from "My Equipment" below, which
            drives card auto-substitution instead. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.45 }}
          className="mb-6"
          data-ocid="profile.equipment_tier_section"
        >
          <div className="flex items-center gap-1.5 mb-3">
            <Dumbbell className="w-3 h-3 text-muted-foreground" />
            <p className="font-display font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
              Equipment Tier
            </p>
          </div>
          <p className="text-xs text-muted-foreground font-body mb-3 leading-snug">
            Shows easier/harder variant suggestions on your workout cards using
            equipment you own. Your exercise and rep count never change.
          </p>
          <div
            className="grid grid-cols-3 gap-2"
            data-ocid="profile.equipment_tier.segmented_control"
          >
            {EQUIPMENT_TIER_OPTIONS.map((option) => {
              const selected = equipmentTier === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setEquipmentTier(option.value)}
                  className="rounded-2xl px-2 py-3 flex flex-col items-center text-center gap-0.5 transition-smooth"
                  style={
                    selected
                      ? {
                          background: "oklch(0.68 0.25 180 / 0.14)",
                          border: "1px solid oklch(0.68 0.25 180 / 0.6)",
                          boxShadow: "0 0 16px oklch(0.68 0.25 180 / 0.18)",
                        }
                      : {
                          background: "oklch(0.16 0.01 260)",
                          border: "1px solid oklch(0.26 0.01 260 / 0.6)",
                        }
                  }
                  data-ocid={`profile.equipment_tier.option_${option.value}`}
                >
                  <span
                    className="font-display font-bold text-xs"
                    style={{
                      color: selected
                        ? "oklch(0.68 0.25 180)"
                        : "oklch(0.92 0.01 260)",
                    }}
                  >
                    {option.label}
                  </span>
                  <span className="text-[9px] font-body leading-tight text-muted-foreground">
                    {option.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* My Equipment */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.17, duration: 0.45 }}
          className="mb-6"
          data-ocid="profile.equipment_section"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
              My Equipment
            </p>
            <button
              type="button"
              onClick={handleRetakeAssessment}
              className="flex items-center gap-1 text-[10px] font-display font-bold uppercase tracking-wide text-primary hover:opacity-75 transition-smooth"
              data-ocid="profile.retake_assessment_button"
            >
              <RotateCcw className="w-3 h-3" /> Retake Assessment
            </button>
          </div>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.5)",
            }}
          >
            {EQUIPMENT_ITEMS.map((item, i) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 px-5 py-3.5"
                style={{
                  borderBottom:
                    i < EQUIPMENT_ITEMS.length - 1
                      ? "1px solid oklch(0.22 0.01 260 / 0.5)"
                      : "none",
                }}
                data-ocid={`profile.equipment.item.${i + 1}`}
              >
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm text-foreground">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5 leading-snug">
                    {item.description}
                  </p>
                </div>
                <Switch
                  checked={equipment[item.key]}
                  onCheckedChange={() => handleToggleEquipment(item.key)}
                  data-ocid={`profile.equipment.toggle.${i + 1}`}
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="mb-6"
          data-ocid="profile.notifications_section"
        >
          <div className="flex items-center gap-1.5 mb-3">
            <Bell className="w-3 h-3 text-muted-foreground" />
            <p className="font-display font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
              Notifications
            </p>
          </div>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.5)",
            }}
          >
            {NOTIFICATION_ITEMS.map((item, i) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 px-5 py-3.5"
                style={{
                  borderBottom:
                    i < NOTIFICATION_ITEMS.length - 1
                      ? "1px solid oklch(0.22 0.01 260 / 0.5)"
                      : "none",
                }}
                data-ocid={`profile.notifications.item.${i + 1}`}
              >
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm text-foreground">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5 leading-snug">
                    {item.description}
                  </p>
                </div>
                <Switch
                  checked={notificationSettings[item.key]}
                  onCheckedChange={() => toggleNotification(item.key)}
                  data-ocid={`profile.notifications.toggle.${i + 1}`}
                />
              </div>
            ))}
          </div>
          {browserPermission === "denied" && (
            <p className="text-xs text-muted-foreground font-body mt-2 px-1 leading-relaxed">
              Notifications are blocked in your browser for this site. Enable
              them in your browser's site settings to use reminders.
            </p>
          )}
        </motion.div>

        {/* Nearby athletes visibility */}
        {isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.205, duration: 0.45 }}
            className="mb-6"
            data-ocid="profile.discoverable_section"
          >
            <div className="flex items-center gap-1.5 mb-3">
              <Users className="w-3 h-3 text-muted-foreground" />
              <p className="font-display font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
                Nearby Athletes
              </p>
            </div>
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "oklch(0.16 0.01 260)",
                border: "1px solid oklch(0.26 0.01 260 / 0.5)",
              }}
            >
              <div className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm text-foreground">
                    Visible to nearby athletes
                  </p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5 leading-snug">
                    Lets other users find you in the Nearby list. Off by default
                    — shares only a rounded (~100m) location and your
                    last-active time, never your exact position.
                  </p>
                </div>
                <Switch
                  checked={profile?.discoverable ?? false}
                  disabled={isTogglingDiscoverable}
                  onCheckedChange={handleToggleDiscoverable}
                  data-ocid="profile.discoverable_toggle"
                />
              </div>
              <button
                type="button"
                onClick={() => navigate({ to: "/nearby" })}
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 transition-smooth hover:opacity-80"
                style={{ borderTop: "1px solid oklch(0.22 0.01 260 / 0.5)" }}
                data-ocid="profile.view_nearby_button"
              >
                <span className="font-display font-bold text-sm text-foreground">
                  View nearby athletes
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Messaging */}
        {isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.208, duration: 0.45 }}
            className="mb-6"
            data-ocid="profile.messaging_section"
          >
            <div className="flex items-center gap-1.5 mb-3">
              <MessageCircle className="w-3 h-3 text-muted-foreground" />
              <p className="font-display font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
                Messaging
              </p>
            </div>
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "oklch(0.16 0.01 260)",
                border: "1px solid oklch(0.26 0.01 260 / 0.5)",
              }}
            >
              <div className="px-5 py-3.5">
                <p className="font-display font-bold text-sm text-foreground mb-0.5">
                  Who can message you
                </p>
                <p className="text-xs text-muted-foreground font-body mb-3 leading-snug">
                  Controls who can start a chat with you from Nearby Athletes.
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { value: "same_gender_only", label: "Same gender" },
                      { value: "anyone", label: "Anyone" },
                      { value: "no_one", label: "No one" },
                    ] as const
                  ).map((option) => {
                    const selected = messagingPreference === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={isSavingMessagingPreference}
                        onClick={() =>
                          handleSetMessagingPreference(option.value)
                        }
                        className="px-3.5 py-1.5 rounded-full text-xs font-display font-bold transition-smooth disabled:opacity-50"
                        style={
                          selected
                            ? {
                                background: "oklch(0.68 0.25 180 / 0.18)",
                                color: "oklch(0.68 0.25 180)",
                                border: "1px solid oklch(0.68 0.25 180 / 0.5)",
                              }
                            : {
                                background: "oklch(0.17 0.012 260)",
                                color: "oklch(0.62 0.008 260)",
                                border: "1px solid oklch(0.28 0.01 260)",
                              }
                        }
                        data-ocid={`profile.messaging_preference.${option.value}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate({ to: "/chat" })}
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 transition-smooth hover:opacity-80"
                style={{ borderTop: "1px solid oklch(0.22 0.01 260 / 0.5)" }}
                data-ocid="profile.view_chats_button"
              >
                <span className="font-display font-bold text-sm text-foreground">
                  View messages
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Training Goal */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.21, duration: 0.45 }}
          className="mb-6"
          data-ocid="profile.training_goal_section"
        >
          <div className="flex items-center gap-1.5 mb-3">
            <Flame className="w-3 h-3 text-muted-foreground" />
            <p className="font-display font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
              Training Goal
            </p>
          </div>
          <div
            className="rounded-2xl p-4"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.5)",
            }}
          >
            <p className="text-xs text-muted-foreground font-body mb-3 leading-snug">
              How many days a week do you want to train? This is your weekly
              streak goal.
            </p>
            <WeeklyGoalPicker
              value={streak.weeklyGoal}
              onChange={setWeeklyGoal}
            />
            <p className="text-center text-sm font-medium text-primary mt-3">
              {streak.weeklyGoal} {streak.weeklyGoal === 1 ? "day" : "days"} a
              week
            </p>
          </div>
        </motion.div>

        {/* Weekly Challenges */}
        {effectiveTier !== "guest" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.215, duration: 0.45 }}
            className="mb-6"
            data-ocid="profile.challenges_section"
          >
            <div className="flex items-center gap-1.5 mb-3">
              <Trophy className="w-3 h-3 text-muted-foreground" />
              <p className="font-display font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
                Weekly Challenges
              </p>
            </div>
            {effectiveTier === "subscriber" ? (
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "oklch(0.16 0.01 260)",
                  border: "1px solid oklch(0.26 0.01 260 / 0.5)",
                }}
              >
                <div
                  className="flex items-center justify-between px-5 py-4"
                  style={{
                    borderBottom:
                      challengeHistory.length > 0
                        ? "1px solid oklch(0.22 0.01 260 / 0.5)"
                        : "none",
                  }}
                  data-ocid="profile.challenges.won_counter"
                >
                  <span className="font-display font-bold text-sm text-foreground">
                    Challenges won
                  </span>
                  <span
                    className="font-display font-black text-sm text-right"
                    style={{ color: "oklch(0.68 0.25 180)" }}
                  >
                    {challengeHistory.length} weekly{" "}
                    {challengeHistory.length === 1 ? "challenge" : "challenges"}{" "}
                    completed
                  </span>
                </div>
                {challengeHistory.length === 0 ? (
                  <div className="px-5 py-6 text-center">
                    <p className="text-xs text-muted-foreground font-body">
                      Complete your first weekly challenge to start your log.
                    </p>
                  </div>
                ) : (
                  [...challengeHistory]
                    .reverse()
                    .slice(0, 10)
                    .map((entry, i, arr) => (
                      <div
                        key={`${entry.weekStart}-${entry.type}`}
                        className="flex items-center gap-3 px-5 py-3.5"
                        style={{
                          borderBottom:
                            i < arr.length - 1
                              ? "1px solid oklch(0.22 0.01 260 / 0.5)"
                              : "none",
                        }}
                        data-ocid={`profile.challenges.history.item.${i + 1}`}
                      >
                        <span className="text-lg w-6 text-center shrink-0">
                          {CHALLENGE_TYPE_EMOJI[entry.type]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-bold text-sm text-foreground truncate">
                            {entry.description}
                          </p>
                          <p className="text-xs text-muted-foreground font-body">
                            {new Date(entry.completedAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            ) : (
              <div
                className="rounded-2xl px-5 py-4 flex items-center gap-3"
                style={{
                  background: "oklch(0.16 0.01 260)",
                  border: "1px solid oklch(0.26 0.01 260 / 0.5)",
                }}
                data-ocid="profile.challenges.locked_note"
              >
                <Lock
                  className="w-4 h-4 shrink-0"
                  style={{ color: "oklch(0.68 0.25 180)" }}
                />
                <p className="text-sm text-foreground font-body">
                  Subscribe to save your challenge history
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Membership */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.23, duration: 0.45 }}
          className="mb-6"
          data-ocid="profile.membership_section"
        >
          <p className="font-display font-bold text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
            Membership
          </p>
          <div
            className="rounded-2xl p-4 flex items-center justify-between gap-3"
            style={{
              background: subscription
                ? "oklch(0.17 0.04 180 / 0.3)"
                : "oklch(0.16 0.01 260)",
              border: subscription
                ? "1px solid oklch(0.68 0.25 180 / 0.35)"
                : "1px solid oklch(0.26 0.01 260 / 0.5)",
            }}
          >
            <div className="min-w-0">
              <p className="font-display font-bold text-sm text-foreground">
                {subscription
                  ? `${getSubscriptionTier(subscription.tierId).label} Plan`
                  : "Free Plan"}
              </p>
              <p className="text-xs text-muted-foreground font-body mt-0.5">
                {subscription
                  ? subscription.startedTrial
                    ? "Includes your 7-day free trial"
                    : "Active subscription"
                  : "20 cards/week, no Pro decks"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: "/subscribe" })}
              className="shrink-0 px-4 h-9 rounded-full font-display font-bold text-xs tracking-wide transition-smooth hover:opacity-90 active:scale-[0.98]"
              style={
                subscription
                  ? {
                      background: "transparent",
                      border: "1px solid oklch(0.68 0.25 180 / 0.4)",
                      color: "oklch(0.68 0.25 180)",
                    }
                  : {
                      background: "oklch(0.68 0.25 180)",
                      color: "oklch(0.08 0.005 260)",
                    }
              }
              data-ocid="profile.membership.manage_button"
            >
              {subscription ? "Manage" : "Upgrade"}
            </button>
          </div>
        </motion.div>

        {/* Referrals */}
        {email && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.45 }}
            className="mb-6"
            data-ocid="profile.referral_section"
          >
            <div className="flex items-center gap-1.5 mb-3">
              <Gift className="w-3 h-3 text-muted-foreground" />
              <p className="font-display font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
                Referrals
              </p>
            </div>
            <div
              className="rounded-2xl p-4"
              style={{
                background: "oklch(0.16 0.01 260)",
                border: "1px solid oklch(0.26 0.01 260 / 0.5)",
              }}
            >
              <p className="text-xs text-muted-foreground font-body mb-3 leading-snug">
                Share your code — you both get 10% off. Discounts stack up to
                50%.
              </p>
              <button
                type="button"
                onClick={handleCopyReferralCode}
                className="w-full h-12 rounded-xl flex items-center justify-between px-4 mb-3 transition-smooth hover:opacity-90"
                style={{
                  background: "oklch(0.13 0.008 260)",
                  border: "1px dashed oklch(0.68 0.25 180 / 0.4)",
                }}
                data-ocid="profile.referral.copy_button"
              >
                <span className="font-display font-black text-sm tracking-widest text-white">
                  {referralCode}
                </span>
                <Copy className="w-4 h-4 text-primary shrink-0" />
              </button>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-body">
                  {referralRecord?.successfulReferrals ?? 0} successful{" "}
                  {(referralRecord?.successfulReferrals ?? 0) === 1
                    ? "referral"
                    : "referrals"}
                </span>
                {referralDiscountPct > 0 && (
                  <span
                    className="flex items-center gap-1 text-xs font-display font-bold"
                    style={{ color: "oklch(0.68 0.25 180)" }}
                    data-ocid="profile.referral.discount_active"
                  >
                    <Sparkles className="w-3 h-3" />
                    {referralDiscountPct}% discount active
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Workout history */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.45 }}
          className="mb-6"
          data-ocid="profile.history_section"
        >
          <p className="font-display font-bold text-[10px] uppercase tracking-widest mb-3 text-muted-foreground">
            Past Sessions
          </p>
          {history && history.length > 0 ? (
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "oklch(0.16 0.01 260)",
                border: "1px solid oklch(0.26 0.01 260 / 0.5)",
              }}
            >
              {[...history]
                .sort((a, b) => Number(b.completedAt) - Number(a.completedAt))
                .slice(0, 10)
                .map((entry, i) => {
                  const date = new Date(Number(entry.completedAt));
                  const dateStr = date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between px-5 py-3.5"
                      style={{
                        borderBottom:
                          i < Math.min(history.length, 10) - 1
                            ? "1px solid oklch(0.22 0.01 260 / 0.5)"
                            : "none",
                      }}
                      data-ocid={`profile.history.item.${i + 1}`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <p className="font-display font-bold text-sm text-foreground">
                          {dateStr}
                        </p>
                        <p className="text-xs text-muted-foreground font-body">
                          {Number(entry.cardsCompleted)} cards ·{" "}
                          {Number(entry.caloriesBurned)} kcal
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="font-display font-black text-base"
                          style={{ color: "oklch(0.68 0.25 180)" }}
                        >
                          {Number(entry.totalReps)}
                        </span>
                        <span
                          className="text-[10px] font-body uppercase tracking-wide"
                          style={{ color: "oklch(0.5 0.008 260)" }}
                        >
                          reps
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div
              className="rounded-2xl px-5 py-8 text-center"
              style={{
                background: "oklch(0.16 0.01 260)",
                border: "1px solid oklch(0.26 0.01 260 / 0.4)",
              }}
              data-ocid="profile.history.empty_state"
            >
              <p className="font-display font-bold text-sm text-foreground mb-1">
                No workouts yet
              </p>
              <p className="text-xs text-muted-foreground font-body">
                Complete your first workout to see your history here.
              </p>
            </div>
          )}
        </motion.div>

        {/* Legal */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.225, duration: 0.45 }}
          className="mb-6"
          data-ocid="profile.legal_section"
        >
          <div className="flex items-center gap-1.5 mb-3">
            <FileText className="w-3 h-3 text-muted-foreground" />
            <p className="font-display font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
              Legal
            </p>
          </div>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.5)",
            }}
          >
            <button
              type="button"
              onClick={openTermsOfUse}
              className="w-full flex items-center justify-between gap-3 px-5 py-3.5 transition-smooth hover:opacity-80"
              data-ocid="profile.terms_link"
            >
              <span className="font-display font-bold text-sm text-foreground">
                Terms of Use
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
            </button>
            <button
              type="button"
              onClick={openPrivacyPolicy}
              className="w-full flex items-center justify-between gap-3 px-5 py-3.5 transition-smooth hover:opacity-80"
              style={{ borderTop: "1px solid oklch(0.22 0.01 260 / 0.5)" }}
              data-ocid="profile.privacy_link"
            >
              <span className="font-display font-bold text-sm text-foreground">
                Privacy Policy
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
            </button>
          </div>
        </motion.div>

        {/* Auth CTA for guests */}
        {!isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <Button
              className="w-full h-14 font-display font-black text-base tracking-wider rounded-2xl"
              style={{
                boxShadow:
                  "0 0 32px oklch(0.68 0.25 180 / 0.28), 0 4px 16px oklch(0 0 0 / 0.25)",
              }}
              onClick={() => navigate({ to: "/onboarding/auth" })}
              data-ocid="profile.sign_in_button"
            >
              Sign In to Save Progress
            </Button>
          </motion.div>
        )}

        {/* Quick action to start workout */}
        {isLoggedIn && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="w-full rounded-2xl px-5 py-4 flex items-center gap-3 hover:border-primary/40 transition-smooth"
            style={{
              background: "oklch(0.16 0.01 260)",
              border: "1px solid oklch(0.26 0.01 260 / 0.5)",
            }}
            onClick={() => navigate({ to: "/decks" })}
            data-ocid="profile.start_workout_button"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "oklch(0.68 0.25 180 / 0.12)" }}
            >
              <Dumbbell
                className="w-4 h-4"
                style={{ color: "oklch(0.68 0.25 180)" }}
              />
            </div>
            <span className="font-display font-bold text-sm text-foreground flex-1 text-left">
              Start New Workout
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
          </motion.button>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 px-5 pb-10 text-center mt-auto">
        <p className="text-xs text-muted-foreground font-body">
          © {new Date().getFullYear()} MyBodyWeight
        </p>
      </footer>
    </div>
  );
}
