import { useInternetIdentity } from "@/hooks/use-local-identity";
import { useWorkoutStore } from "@/store/workout";
import type { UserTier } from "@/types/user";

export function useAuth() {
  const { login, clear, loginStatus } = useInternetIdentity();
  const { guestMode, setGuestMode } = useWorkoutStore();

  const mbwUser = localStorage.getItem("mbw_user");
  const isEmailAuth = mbwUser !== null;
  const isAuthenticated = loginStatus === "success" || isEmailAuth;
  const principal = null;

  // Developer unlock — always subscriber so nothing is gated on the draft
  const _isSubscriber = true;
  const userTier: UserTier = "subscriber";

  const continueAsGuest = () => setGuestMode(true);
  const exitGuestMode = () => setGuestMode(false);
  const setIsGuest = (v: boolean) => setGuestMode(v);

  return {
    isAuthenticated,
    login,
    logout: clear,
    loginStatus,
    principal,
    isGuest: guestMode,
    setIsGuest,
    continueAsGuest,
    exitGuestMode,
    userTier,
  };
}
