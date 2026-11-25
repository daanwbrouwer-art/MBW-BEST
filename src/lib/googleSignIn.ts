// "Continue with Google", through Supabase OAuth with PKCE.
//
// Web: the page itself goes to Google and comes back on GOOGLE_CALLBACK_PATH.
// Android: Google opens in the system browser (it refuses to run in a
// WebView) and comes back through a com.mybodyweight.app:// link, which
// installAuthLinks turns into the same GOOGLE_CALLBACK_PATH.
import { supabase } from "@/lib/supabaseClient";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { type User, createClient } from "@supabase/supabase-js";

export const GOOGLE_CALLBACK_PATH = "/onboarding/google";
const NATIVE_CALLBACK_URL = "com.mybodyweight.app://auth-callback";
const OAUTH_STORAGE_KEY = "mbw-oauth";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Its own client: another app can claim our custom link scheme, so the link
// must not carry usable tokens (PKCE). The main client stays on the implicit
// flow, because password-reset emails are often opened in another browser.
const oauthClient = createClient(
  url || "https://placeholder.invalid.supabase.co",
  anonKey || "placeholder-anon-key",
  {
    auth: {
      flowType: "pkce",
      storageKey: OAUTH_STORAGE_KEY,
      detectSessionInUrl: false,
      autoRefreshToken: false,
    },
  },
);

/**
 * True once Google is switched on in Supabase (Authentication > Providers).
 * Never on iOS: offering Google there requires Sign in with Apple as well.
 */
export async function isGoogleSignInAvailable(): Promise<boolean> {
  if (!url || !anonKey || Capacitor.getPlatform() === "ios") return false;
  const response = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: anonKey },
  });
  if (!response.ok) throw new Error(`Auth settings: ${response.status}`);
  const settings = (await response.json()) as {
    external?: { google?: boolean };
  };
  return settings.external?.google === true;
}

/** Opens Google's account picker. Throws when it can't be opened. */
export async function startGoogleSignIn(): Promise<void> {
  const isNative = Capacitor.isNativePlatform();
  const { data, error } = await oauthClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: isNative
        ? NATIVE_CALLBACK_URL
        : window.location.origin + GOOGLE_CALLBACK_PATH,
      queryParams: { prompt: "select_account" },
      skipBrowserRedirect: isNative,
    },
  });
  if (error) throw error;
  if (isNative) await Browser.open({ url: data.url });
}

/** The one-time code in our own callback link, or null for any other link. */
export function parseAuthLink(link: string): { code: string } | null {
  if (!link.startsWith(`${NATIVE_CALLBACK_URL}?`)) return null;
  const params = new URLSearchParams(link.slice(link.indexOf("?")));
  // No code means Google or the user refused: the callback page says so.
  return { code: params.get("code") ?? "" };
}

/** Android: sends the link Google came back on to the callback page. */
export function installAuthLinks(open: (code: string) => void): void {
  if (!Capacitor.isNativePlatform()) return;
  void App.addListener("appUrlOpen", (event) => {
    const link = parseAuthLink(event.url);
    // Any app can open our link: ignore it unless we started a sign-in.
    const started =
      localStorage.getItem(`${OAUTH_STORAGE_KEY}-code-verifier`) !== null;
    if (!link || !started) return;
    Browser.close().catch(() => {});
    open(link.code);
  });
}

/** Trades the one-time code for a session on the main client. */
export async function finishGoogleSignIn(code: string): Promise<User> {
  const { data, error } = await oauthClient.auth.exchangeCodeForSession(code);
  if (error) throw error;
  const { access_token, refresh_token } = data.session;
  const { error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  // Not oauthClient.signOut(): that would end the session we just moved.
  localStorage.removeItem(OAUTH_STORAGE_KEY);
  if (sessionError) throw sessionError;
  return data.user;
}

/**
 * Google signs in and signs up with one button, so the account's age tells
 * which it was. Two minutes: the account is created when Google returns, the
 * sign-in counts a moment later when the app trades the code.
 */
export function isNewAccount(
  user: Pick<User, "created_at" | "last_sign_in_at">,
): boolean {
  if (!user.last_sign_in_at) return true;
  const gap = Date.parse(user.last_sign_in_at) - Date.parse(user.created_at);
  return gap < 2 * 60_000;
}
