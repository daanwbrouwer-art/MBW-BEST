import { hasUnseenUnlocks } from "@/lib/achievementEngine";
import { cn } from "@/lib/utils";
import { useWorkoutStore } from "@/store/workout";
import { useNavigate } from "@tanstack/react-router";
import { Home, MapPin, Trophy, User, Users } from "lucide-react";
import { motion } from "motion/react";

type TabPath =
  | "/home"
  | "/train-together"
  | "/achievements"
  | "/map"
  | "/profile";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  to: TabPath;
  ocid: string;
  /** Four-colour deck: each area of the app owns a suit colour. */
  role: "primary" | "energy" | "prestige" | "pulse";
}

const ITEMS: NavItem[] = [
  {
    icon: <Home className="w-5 h-5" />,
    label: "Home",
    to: "/home",
    ocid: "bottom-nav.home_tab",
    role: "primary",
  },
  {
    icon: <Users className="w-5 h-5" />,
    label: "Together",
    to: "/train-together",
    ocid: "bottom-nav.together_tab",
    role: "pulse",
  },
  {
    icon: <Trophy className="w-5 h-5" />,
    label: "Awards",
    to: "/achievements",
    ocid: "bottom-nav.achievements_tab",
    role: "prestige",
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    label: "Map",
    to: "/map",
    ocid: "bottom-nav.map_tab",
    role: "pulse",
  },
  {
    icon: <User className="w-5 h-5" />,
    label: "Profile",
    to: "/profile",
    ocid: "bottom-nav.profile_tab",
    role: "energy",
  },
];

/** Tab routes in nav order — the root layout uses this to show the nav and
 *  to pick the slide direction between tabs. */
export const NAV_TAB_PATHS: string[] = ITEMS.map((i) => i.to);

const SPRING = { type: "spring", stiffness: 420, damping: 34 } as const;

interface BottomNavProps {
  /** Index into NAV_TAB_PATHS of the current tab. */
  activeIndex: number;
}

export function BottomNav({ activeIndex }: BottomNavProps) {
  const navigate = useNavigate();
  const guestMode = useWorkoutStore((s) => s.guestMode);
  const isEmailAuth = localStorage.getItem("mbw_user") !== null;
  const isGuest = guestMode && !isEmailAuth;
  const hasUnseenAchievements = hasUnseenUnlocks(isGuest);
  const activeRole = ITEMS[activeIndex]?.role ?? "primary";

  return (
    <nav
      className="fixed inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)" }}
      aria-label="Bottom navigation"
    >
      {/* Floating glass pill */}
      <div
        className="pointer-events-auto w-full max-w-[398px] rounded-full p-1.5"
        style={{
          background: "oklch(0.15 0.012 var(--neutral-hue) / 0.82)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid oklch(1 0 0 / 0.08)",
          boxShadow:
            "0 16px 40px -12px oklch(0 0 0 / 0.7), 0 2px 8px oklch(0 0 0 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.06)",
        }}
      >
        <div className="relative flex items-stretch">
          {/* Sliding indicator, tinted with the active tab's suit colour */}
          <motion.span
            aria-hidden
            className="absolute inset-y-0 rounded-full"
            initial={false}
            animate={{ left: `${activeIndex * 20}%` }}
            transition={SPRING}
            style={{
              width: "20%",
              background: `oklch(var(--${activeRole}) / 0.16)`,
              boxShadow: `inset 0 0 0 1px oklch(var(--${activeRole}) / 0.35), 0 0 20px oklch(var(--${activeRole}) / 0.25)`,
              transition: "background 0.3s, box-shadow 0.3s",
            }}
          />
          {ITEMS.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <motion.button
                key={item.label}
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate({ to: item.to })}
                className={cn(
                  "relative flex-1 min-w-0 flex flex-col items-center gap-0.5 px-1 py-2 rounded-full transition-colors duration-300",
                  isActive ? "" : "opacity-55 hover:opacity-85",
                )}
                style={{
                  color: isActive
                    ? `oklch(var(--${item.role}))`
                    : "oklch(var(--foreground))",
                }}
                aria-current={isActive ? "page" : undefined}
                data-ocid={item.ocid}
                aria-label={item.label}
              >
                <motion.span
                  className="relative"
                  animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.1 : 1 }}
                  transition={SPRING}
                >
                  {item.icon}
                  {item.label === "Awards" && hasUnseenAchievements && (
                    <span
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                      style={{
                        background: "oklch(var(--highlight))",
                        boxShadow: "0 0 6px oklch(var(--highlight))",
                      }}
                      data-ocid="bottom-nav.achievements_unseen_dot"
                    />
                  )}
                </motion.span>
                <span className="font-display font-bold text-xs truncate max-w-full">
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
