import { useNotifications } from "@/hooks/use-notifications";
import { openPrivacyPolicy } from "@/lib/legal";
import {
  DAILY_NOTIFICATION_TITLE,
  getDailyNotificationBody,
} from "@/lib/notificationContent";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";

function PhoneMockup({ previewBody }: { previewBody: string }) {
  return (
    <div className="relative mx-auto" style={{ width: 220, height: 280 }}>
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: "oklch(0.68 0.25 180 / 0.16)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="relative w-full h-full rounded-[34px] overflow-hidden"
        style={{
          border: "6px solid oklch(0.2 0.01 260)",
          background:
            "linear-gradient(180deg, oklch(0.15 0.015 220) 0%, oklch(0.1 0.01 240) 100%)",
          boxShadow: "0 20px 50px oklch(0 0 0 / 0.45)",
        }}
      >
        {/* Notch */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 rounded-b-xl z-10"
          style={{ background: "oklch(0.08 0.005 240)" }}
        />

        {/* Status bar spacer */}
        <div className="h-9" />

        {/* Notification banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-3 rounded-2xl px-3 py-2.5 flex gap-2.5 items-start"
          style={{
            background: "oklch(0.24 0.015 260 / 0.92)",
            border: "1px solid oklch(0.38 0.01 260 / 0.5)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "oklch(0.68 0.25 180 / 0.18)" }}
          >
            <img
              src="/assets/images/mbw-logo-white-icon.png"
              alt=""
              className="w-4 h-4 object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-display font-bold text-white/70 uppercase tracking-wide">
                MyBodyWeight
              </span>
              <span className="text-[8px] text-white/35 shrink-0">now</span>
            </div>
            <p className="text-[11px] font-display font-bold text-white mt-0.5 leading-snug">
              {DAILY_NOTIFICATION_TITLE}
            </p>
            <p
              className="text-[10px] text-white/60 mt-0.5 leading-snug"
              style={{ filter: "blur(1.5px)" }}
            >
              {previewBody}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function NotificationPermissionPage() {
  const navigate = useNavigate();
  const { requestPermission, updateSettings } = useNotifications();
  const [isRequesting, setIsRequesting] = useState(false);
  const previewBody = getDailyNotificationBody();

  const proceed = () => {
    const isEmailAuth = localStorage.getItem("mbw_user") !== null;
    navigate({
      to: isEmailAuth ? "/home" : "/onboarding/welcome",
      replace: true,
    });
  };

  const handleEnable = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestPermission();
      updateSettings({ enabled: granted, reminders: granted });
      if (granted && typeof Notification !== "undefined") {
        try {
          new Notification(DAILY_NOTIFICATION_TITLE, {
            body: previewBody,
            icon: "/assets/images/mbw-logo-white-icon.png",
          });
        } catch {
          // Notification construction can fail in some contexts (e.g. no
          // service worker on some platforms) — the permission + settings
          // were still recorded correctly either way.
        }
      }
    } finally {
      setIsRequesting(false);
      proceed();
    }
  };

  const handleNotNow = () => {
    updateSettings({ enabled: false, reminders: false, weeklySummary: false });
    proceed();
  };

  return (
    <div
      className="min-h-dvh flex flex-col max-w-[430px] mx-auto relative overflow-hidden bg-background"
      data-ocid="notification-permission.page"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 45% at 50% 0%, oklch(0.22 0.05 180 / 0.28) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 flex flex-col flex-1 px-6 pb-10">
        <div className="pt-14 pb-6">
          <PhoneMockup previewBody={previewBody} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col flex-1 text-center"
        >
          <h1 className="font-display font-black text-2xl uppercase tracking-widest-custom leading-tight text-white mb-3">
            Training reminders
            <br />
            and more!
          </h1>
          <p className="font-body text-sm text-white/50 leading-relaxed max-w-[300px] mx-auto mb-4">
            Activate notifications to get training reminders, motivation, and
            updates on new features!
          </p>

          <button
            type="button"
            onClick={openPrivacyPolicy}
            className="font-body text-xs text-white/35 underline hover:text-white/55 transition-smooth mx-auto mb-auto"
            data-ocid="notification-permission.privacy_link"
          >
            Privacy Policy
          </button>

          <div className="flex flex-col gap-3 mt-8">
            <button
              type="button"
              onClick={handleEnable}
              disabled={isRequesting}
              className="w-full h-14 rounded-full flex items-center justify-center font-display font-bold text-sm tracking-wide bg-primary text-background transition-smooth hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              data-ocid="notification-permission.enable_button"
            >
              {isRequesting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Turning on...
                </span>
              ) : (
                "Turn on reminders"
              )}
            </button>

            <button
              type="button"
              onClick={handleNotNow}
              className="w-full h-14 rounded-full flex items-center justify-center font-display font-bold text-sm tracking-wide text-foreground border border-white/40 bg-transparent transition-smooth hover:opacity-90 active:scale-[0.98]"
              data-ocid="notification-permission.dismiss_button"
            >
              Not now
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
