import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False until .env has real Supabase project credentials (see .env.example). */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // Deliberately not a throw: MapPage and remoteBackend both import
  // `supabase` at module scope, and a throw there would white-screen the
  // entire app (including guest/local-only screens that never touch
  // Supabase) any time .env isn't filled in yet. Callers check
  // `isSupabaseConfigured` or handle the resulting network/auth errors from
  // calls against this placeholder project instead.
  console.warn(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — copy .env.example to .env and fill " +
      "in your Supabase project's URL and anon key (Project Settings > API). Supabase-backed " +
      "features (Map, remoteBackend) will fail their network calls until then.",
  );
}

export const supabase = createClient<Database>(
  url || "https://placeholder.invalid.supabase.co",
  anonKey || "placeholder-anon-key",
);

/**
 * Returns the current user's id, transparently creating an anonymous
 * Supabase session if nobody is signed in yet — so features like "add a
 * park" don't require a real account. Anonymous sessions carry Postgres's
 * `authenticated` role (just with `is_anonymous: true`), so they satisfy
 * every RLS policy written as `to authenticated` without any policy changes.
 *
 * Requires the "Anonymous Sign-Ins" provider to be enabled in the Supabase
 * dashboard (Authentication > Providers) — it's off by default on new
 * projects. Returns null (rather than throwing) if it's still disabled or
 * the network call otherwise fails, so callers can show a friendly message.
 */
export async function ensureSupabaseSession(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  if (data.user) return data.user.id;
  const { data: anonData, error } = await supabase.auth.signInAnonymously();
  if (error || !anonData.user) {
    console.warn(
      `Couldn't start an anonymous Supabase session — enable the \"Anonymous Sign-Ins\" provider in the Supabase dashboard (Authentication > Providers). ${error?.message ?? ""}`,
    );
    return null;
  }
  return anonData.user.id;
}
