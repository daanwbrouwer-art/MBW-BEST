import { reloadCustomDecks } from "@/store/customWorkout";
import { signOut, wipeAccountData } from "./accountSession";
import { supabase } from "./supabaseClient";

// Account deletion (Google Play / App Store requirement). The server side
// lives in supabase/functions/delete-account — it deletes the Supabase
// account the current session belongs to, plus everything tied to it.
//
// Kept on the device on purpose: `mbw_trial`. The free trial is "once per
// device" per the Subscription Terms, so deleting and re-creating an account
// must not hand out a second trial.
const KEPT_LOCAL_KEYS = new Set(["mbw_trial"]);

/** Removes every piece of app data stored on this device (except the trial marker). */
export function wipeLocalAppData(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("mbw_") && !KEPT_LOCAL_KEYS.has(key)) keys.push(key);
  }
  for (const key of keys) localStorage.removeItem(key);
}

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

/**
 * Permanently deletes the signed-in user's account on the server (if there
 * is a Supabase session), then wipes all local app data. For a guest with no
 * server account, only the local wipe happens.
 */
export async function deleteAccount(): Promise<DeleteAccountResult> {
  const { data } = await supabase.auth.getSession();

  if (data.session) {
    const { error } = await supabase.functions.invoke("delete-account", {
      method: "POST",
    });
    if (error) {
      return {
        ok: false,
        error:
          "We couldn't delete your account right now. Check your connection and try again, or email mybodyweight@outlook.com.",
      };
    }
  }

  // The account no longer exists server-side: end the local session, log
  // RevenueCat out and reset the in-memory stores, then remove everything
  // else (guest data and settings too) except the trial marker.
  // No flush: there is no account left to upload to.
  await signOut({ flush: false });
  wipeAccountData();
  wipeLocalAppData();
  reloadCustomDecks();
  return { ok: true };
}
