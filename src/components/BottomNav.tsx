import { hasUnseenUnlocks } from "@/lib/achievementEngine";
import { cn } from "@/lib/utils";
import { useWorkoutStore } from "@/store/workout";
import { useNavigate } from "@tanstack/react-router";
import { Home, MapPin, Trophy, User, Users } from "lucide-react";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  to: string;
  ocid: string;
}

interface BottomNavProps {
  active: "home" | "together" | "achievements" | "map" | "profile";
}

const ACCENT = "oklch(0.68 0.25 180)";

export function BottomNav({ active }: BottomNavProps) {
  const navigate = useNavigate();
  const guestMode = useWorkoutStore((s) => s.guestMode);
  const isEmailAuth = localStorage.getItem("mbw_user") !== null;
  const isGuest = guestMode && !isEmailAuth;
  const hasUnseenAchievements = hasUnseenUnlocks(isGuest);

  const items: NavItem[] = [
    {
      icon: <Home className="w-5 h-5" />,
      label: "Home",
      to: "/home",
      ocid: "bottom-nav.home_tab",
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: "Together",
      to: "/train-together",
      ocid: "bottom-nav.together_tab",
    },
    {
      icon: <Trophy className="w-5 h-5" />,
      label: "Achievements",
      to: "/achievements",
      ocid: "bottom-nav.achievements_tab",
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      label: "Map",
      to: "/map",
      ocid: "bottom-nav.map_tab",
    },
    {
      icon: <User className="w-5 h-5" />,
      label: "Profile",
      to: "/profile",
      ocid: "bottom-nav.profile_tab",
    },
  ];

  const activeKeys: Record<BottomNavProps["active"], string> = {
    home: "Home",
    together: "Together",
    achievements: "Achievements",
    map: "Map",
    profile: "Profile",
  };

  const activeLabel = activeKeys[active];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-50"
      style={{
        background: "oklch(0.10 0.008 260 / 0.97)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid oklch(0.22 0.01 260 / 0.6)",
      }}
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {items.map((item) => {
          const isActive = item.label === activeLabel;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() =>
                navigate({
                  to: item.to as
                    | "/home"
                    | "/train-together"
                    | "/achievements"
                    | "/map"
                    | "/profile",
                })
              }
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl transition-smooth",
                isActive ? "" : "opacity-45 hover:opacity-65",
              )}
              style={isActive ? { color: ACCENT } : { color: "white" }}
              data-ocid={item.ocid}
              aria-label={item.label}
            >
              <span className="relative">
                {item.icon}
                {item.label === "Achievements" && hasUnseenAchievements && (
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                    style={{
                      background: "#ef4444",
                      boxShadow: "0 0 4px #ef4444",
                    }}
                    data-ocid="bottom-nav.achievements_unseen_dot"
                  />
                )}
              </span>
              <span className="font-display font-bold text-[10px] uppercase tracking-wider">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
