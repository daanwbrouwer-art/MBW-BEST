// Drop-in replacement for Caffeine's `useInternetIdentity()`. There is no
// Internet Computer / Internet Identity login in this build — sign-in happens
// through the plain email/password screens — so `loginStatus` simply mirrors
// whether a local email session (`mbw_user`) is active.

export type LoginStatus = "idle" | "logging-in" | "success" | "error";

export interface LocalIdentity {
  login: () => void;
  clear: () => void;
  loginStatus: LoginStatus;
  identity: null;
}

export function useInternetIdentity(): LocalIdentity {
  const isEmailAuth =
    typeof window !== "undefined" && localStorage.getItem("mbw_user") !== null;

  return {
    login: () => {
      // No Internet Identity provider in this build — use the email/password
      // screens (/onboarding/auth, /onboarding/create-account) to sign in.
    },
    clear: () => {
      localStorage.removeItem("mbw_user");
      localStorage.removeItem("mbw_first_login");
    },
    loginStatus: isEmailAuth ? "success" : "idle",
    identity: null,
  };
}
