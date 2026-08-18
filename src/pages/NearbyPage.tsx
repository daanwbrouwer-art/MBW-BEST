import { LocationPermissionSheet } from "@/components/LocationPermissionSheet";
import { Logo } from "@/components/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { useInternetIdentity } from "@/hooks/use-local-identity";
import { hasSeenLocationPrompt, useLocation } from "@/hooks/use-location";
import { useProfile } from "@/hooks/use-profile";
import {
  type NearbyAthlete,
  blockUser,
  createOrGetThread,
  getNearbyProfiles,
  reportUser,
} from "@/lib/remoteBackend";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Flag, MoreVertical, ShieldOff, Users } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const DEFAULT_RADIUS_KM = 10;

function timeAgoLabel(iso: string): string {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "active just now";
  if (hours < 24) return `active ${hours}h ago`;
  return `active ${Math.floor(hours / 24)}d ago`;
}

function distanceLabel(km: number): string {
  return km < 1 ? "< 1 km away" : `~${km.toFixed(1)} km away`;
}

export default function NearbyPage() {
  const navigate = useNavigate();
  const { loginStatus } = useInternetIdentity();
  const isLoggedIn = loginStatus === "success";
  const { data: profile } = useProfile();
  const { getCurrentPosition } = useLocation();
  const queryClient = useQueryClient();

  const [position, setPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once when isLoggedIn resolves, not on every position/radius change
  useEffect(() => {
    if (!isLoggedIn) return;
    if (!hasSeenLocationPrompt()) {
      setShowLocationPrompt(true);
      return;
    }
    getCurrentPosition().then(setPosition);
  }, [isLoggedIn]);

  const handleLocationSheetClose = (granted: boolean) => {
    setShowLocationPrompt(false);
    if (granted) getCurrentPosition().then(setPosition);
  };

  const isDiscoverable = profile?.discoverable ?? false;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      "nearby-profiles",
      position?.latitude,
      position?.longitude,
      radiusKm,
    ],
    queryFn: () =>
      getNearbyProfiles(position!.latitude, position!.longitude, radiusKm),
    enabled: isLoggedIn && isDiscoverable && !!position,
  });

  const athletes: NearbyAthlete[] = data?.ok ? data.athletes : [];
  // getNearbyProfiles() never throws — a Supabase/RLS failure comes back as
  // `{ ok: false }`, not a rejected query, so `isError` alone (which only
  // fires for a thrown/rejected queryFn, e.g. the fetch itself failing while
  // fully offline) misses most real failures. Check both so a misconfigured
  // env var or an RLS rejection doesn't silently render as "no one nearby."
  const hasError = isError || (data ? !data.ok : false);

  const handleSayHi = async (athlete: NearbyAthlete) => {
    const result = await createOrGetThread(athlete.id);
    if (!result.ok) {
      toast("Couldn't start a chat", { description: result.error });
      return;
    }
    navigate({ to: "/chat/$threadId", params: { threadId: result.threadId } });
  };

  const handleBlock = async (athlete: NearbyAthlete) => {
    const result = await blockUser(athlete.id);
    if (!result.ok) {
      toast("Couldn't block", { description: result.error });
      return;
    }
    toast("Blocked", {
      description: `${athlete.username} won't appear in your nearby list again.`,
    });
    queryClient.invalidateQueries({ queryKey: ["nearby-profiles"] });
  };

  const handleReport = async (athlete: NearbyAthlete) => {
    const result = await reportUser(athlete.id, "Reported from Nearby list");
    if (!result.ok) {
      toast("Couldn't submit report", { description: result.error });
      return;
    }
    toast("Report submitted", {
      description: "Thanks — our team will review this.",
    });
  };

  return (
    <div
      className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto relative"
      data-ocid="nearby.page"
    >
      <div
        className="absolute inset-0 pointer-events-none max-w-[430px] mx-auto"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.22 0.04 180 / 0.22) 0%, transparent 60%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4">
        <button
          type="button"
          className="w-9 h-9 rounded-xl bg-card/80 border border-border/60 flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-smooth"
          onClick={() => navigate({ to: "/profile" })}
          data-ocid="nearby.back_button"
          aria-label="Go back to profile"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Logo size="sm" showIcon />
        <div className="w-9" />
      </header>

      <div className="relative z-10 flex flex-col flex-1 px-5 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="pt-2 pb-6"
        >
          <h1 className="font-display font-black text-2xl text-foreground mb-1">
            Nearby Athletes
          </h1>
          <p className="text-xs text-muted-foreground font-body">
            Training partners active near you in the last 48 hours
          </p>
        </motion.div>

        {!isLoggedIn ? (
          <EmptyState
            icon={
              <Users
                className="w-7 h-7"
                style={{ color: "oklch(0.68 0.25 180 / 0.5)" }}
              />
            }
            title="Sign in required"
            description="Create an account to find nearby training partners."
            actionLabel="Sign in"
            onAction={() => navigate({ to: "/onboarding/auth" })}
            ocid="nearby.signin_required"
          />
        ) : !isDiscoverable ? (
          <EmptyState
            icon={
              <Users
                className="w-7 h-7"
                style={{ color: "oklch(0.68 0.25 180 / 0.5)" }}
              />
            }
            title="Visibility is off"
            description="Turn on “Visible to nearby athletes” in your profile to see who's training near you."
            actionLabel="Open profile settings"
            onAction={() => navigate({ to: "/profile" })}
            ocid="nearby.not_discoverable"
          />
        ) : !position ? (
          <EmptyState
            icon={
              <Users
                className="w-7 h-7"
                style={{ color: "oklch(0.68 0.25 180 / 0.5)" }}
              />
            }
            title="Location needed"
            description="We need your location to find athletes training nearby."
            actionLabel="Enable location"
            onAction={() => setShowLocationPrompt(true)}
            ocid="nearby.no_location"
          />
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="rounded-2xl p-4 mb-5"
              style={{
                background: "oklch(0.16 0.01 260)",
                border: "1px solid oklch(0.26 0.01 260 / 0.5)",
              }}
              data-ocid="nearby.radius_control"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-display font-bold text-xs uppercase tracking-widest text-muted-foreground">
                  Search radius
                </span>
                <span
                  className="font-display font-black text-sm"
                  style={{ color: "oklch(0.68 0.25 180)" }}
                >
                  {radiusKm} km
                </span>
              </div>
              <Slider
                value={[radiusKm]}
                onValueChange={([next]) => setRadiusKm(next)}
                min={1}
                max={50}
                step={1}
                data-ocid="nearby.radius_slider"
              />
            </motion.div>

            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : hasError ? (
              <EmptyState
                icon={
                  <Users
                    className="w-7 h-7"
                    style={{ color: "oklch(0.68 0.25 180 / 0.5)" }}
                  />
                }
                title="Can't connect right now"
                description="Check your connection and try again."
                actionLabel="Try again"
                onAction={() => refetch()}
                ocid="nearby.error_state"
              />
            ) : athletes.length === 0 ? (
              <EmptyState
                icon={
                  <Users
                    className="w-7 h-7"
                    style={{ color: "oklch(0.68 0.25 180 / 0.5)" }}
                  />
                }
                title="No one nearby right now"
                description="Try widening your search radius, or check back later."
                ocid="nearby.empty_results"
              />
            ) : (
              <div className="flex flex-col gap-3">
                {athletes.map((athlete, i) => (
                  <motion.div
                    key={athlete.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: Math.min(i * 0.04, 0.4),
                      duration: 0.35,
                    }}
                    className="rounded-2xl p-4 flex items-center gap-3"
                    style={{
                      background: "oklch(0.16 0.01 260)",
                      border: "1px solid oklch(0.26 0.01 260 / 0.5)",
                    }}
                    data-ocid={`nearby.card.${i + 1}`}
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-display font-black text-sm"
                      style={{
                        background: "oklch(0.68 0.25 180 / 0.15)",
                        color: "oklch(0.68 0.25 180)",
                      }}
                    >
                      {athlete.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-display font-bold text-sm text-foreground truncate">
                          {athlete.username}
                        </p>
                        {athlete.gender && (
                          <span
                            className="text-[10px] font-display font-bold px-2 py-0.5 rounded-full shrink-0"
                            style={{
                              background: "oklch(0.28 0.01 260 / 0.6)",
                              color: "oklch(0.7 0.008 260)",
                            }}
                          >
                            {athlete.gender}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-body mt-0.5">
                        {distanceLabel(athlete.distanceKm)} ·{" "}
                        {timeAgoLabel(athlete.lastActiveAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSayHi(athlete)}
                      className="shrink-0 px-3.5 h-9 rounded-full font-display font-bold text-xs tracking-wide bg-primary text-background transition-smooth hover:opacity-90 active:scale-[0.98]"
                      data-ocid={`nearby.say_hi.${i + 1}`}
                    >
                      Say hi
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-smooth"
                          aria-label="More options"
                          data-ocid={`nearby.menu_trigger.${i + 1}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleReport(athlete)}
                          data-ocid={`nearby.report.${i + 1}`}
                        >
                          <Flag className="w-4 h-4 mr-2" /> Report
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleBlock(athlete)}
                          className="text-destructive"
                          data-ocid={`nearby.block.${i + 1}`}
                        >
                          <ShieldOff className="w-4 h-4 mr-2" /> Block
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showLocationPrompt && (
        <LocationPermissionSheet onClose={handleLocationSheetClose} />
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  ocid,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  ocid: string;
}) {
  return (
    <div
      className="rounded-2xl px-5 py-10 text-center"
      style={{
        background: "oklch(0.16 0.01 260)",
        border: "1px solid oklch(0.26 0.01 260 / 0.4)",
      }}
      data-ocid={ocid}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: "oklch(0.68 0.25 180 / 0.1)" }}
      >
        {icon}
      </div>
      <p className="font-display font-bold text-sm text-foreground mb-1">
        {title}
      </p>
      <p className="text-white/70 font-body text-xs mb-5">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-5 h-11 rounded-full font-display font-bold text-xs tracking-wide bg-primary text-background transition-smooth hover:opacity-90 active:scale-[0.98]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
