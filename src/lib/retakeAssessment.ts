// "Retake assessment" from Profile reopens the onboarding questionnaire in
// edit mode. The request is a per-tab flag (sessionStorage), so it never
// leaks into a later first-time onboarding (e.g. a returning guest).
const RETAKE_KEY = "mbw_retake_requested";

export function startRetake(): void {
  try {
    sessionStorage.setItem(RETAKE_KEY, "1");
  } catch {
    // Storage unavailable: the questionnaire runs in its normal mode.
  }
}

export function isRetakeRequested(): boolean {
  try {
    return sessionStorage.getItem(RETAKE_KEY) === "1";
  } catch {
    return false;
  }
}

export function endRetake(): void {
  try {
    sessionStorage.removeItem(RETAKE_KEY);
  } catch {
    // Nothing to clear.
  }
}
