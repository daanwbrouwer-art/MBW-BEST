import type {
  OnboardingData,
  Principal,
  UserProfile,
  WorkoutHistoryEntry,
  backendInterface,
} from "../backend";
import type { Database } from "./database.types";
import { localBackend } from "./localBackend";
import { supabase } from "./supabaseClient";

// ─── Supabase-backed data layer ────────────────────────────────────────────
// Infrastructure only — nothing in this file is imported by the UI yet (see
// src/hooks/use-local-actor.ts, still wired to localBackend). It exists so
// the swap can happen later without changing any call site: remoteBackend
// satisfies the exact same backendInterface as localBackend.
//
// Everything NOT related to account identity / profile / discovery is
// spread in from localBackend unchanged below — those methods (deck
// contents, joker combos, achievements list, admin tier tools, ...) are
// static mocks even in local mode today.
//
// `workout_history` now exists live (supabase/migrations/20260726120900) and
// saveWorkoutHistory/getMyWorkoutHistory below actually read/write it. The
// `profiles` table also grew lifetime-stat columns in the same batch
// (20260726120800), but dbProfileToUserProfile still zeroes them out below —
// wiring getMyProfile up to real values is a separate, not-yet-done step;
// the app's actual stats displays (Profile, Progress) read from local
// storage (src/lib/streak.ts) regardless of account type, so that's not a
// visible regression for anything currently wired up.
//
// Auth note: the app hashes passwords client-side (see src/hooks/use-auth.ts
// hashPassword) before they ever reach backendInterface, so `passwordHash`
// below is passed straight through as the Supabase Auth "password" — Supabase
// hashes it again server-side. That's intentional (the raw password never
// leaves the device) but means Supabase Auth is authenticating against a
// hash-of-a-password, not the password itself; harmless, just worth knowing
// if this is ever compared against a Supabase project that also has native
// mobile/social sign-in expecting the real password.
//
// Password reset lives at https://reset.my-bodyweight.com — the app
// initiates the flow via supabase.auth.resetPasswordForEmail (called
// directly from ForgotPasswordPage.tsx, not through backendInterface); the
// web page handles the token exchange and password update, and the user
// comes back to the app to sign in. There's no resetPassword/requestPassword
// method here — it's not part of this backend's surface.

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type WorkoutHistoryRow = Database["public"]["Tables"]["workout_history"]["Row"];
type WorkoutHistoryInsert =
  Database["public"]["Tables"]["workout_history"]["Insert"];

function dbRowToWorkoutHistoryEntry(
  row: WorkoutHistoryRow,
): WorkoutHistoryEntry {
  const repsByExercise = Array.isArray(row.reps_by_exercise)
    ? (row.reps_by_exercise as [string, number][]).map(
        ([name, reps]): [string, bigint] => [name, BigInt(reps)],
      )
    : [];
  return {
    id: row.id,
    completedAt: BigInt(new Date(row.completed_at).getTime()),
    userId: row.user_id as unknown as Principal,
    deckId: row.deck_id,
    totalReps: BigInt(row.total_reps),
    kingCardsDrawn: BigInt(row.king_cards_drawn),
    durationSeconds: BigInt(row.duration_seconds),
    cardsCompleted: BigInt(row.cards_completed),
    caloriesBurned: BigInt(row.calories_burned),
    aceCardsDrawn: BigInt(row.ace_cards_drawn),
    jokerCardsDrawn: BigInt(row.joker_cards_drawn),
    repsBySuit: {
      diamonds: BigInt(row.reps_diamonds),
      clubs: BigInt(row.reps_clubs),
      spades: BigInt(row.reps_spades),
      hearts: BigInt(row.reps_hearts),
    },
    isValid: row.is_valid,
    avgTimePerCard: row.avg_time_per_card,
    repsByExercise,
  };
}

function dbProfileToUserProfile(row: ProfileRow): UserProfile {
  const zero = BigInt(0);
  return {
    principal: row.id as unknown as Principal,
    username: row.username ?? "",
    email: "",
    createdAt: zero,
    totalWorkouts: zero,
    totalCalories: zero,
    totalReps: zero,
    lastWorkoutDate: undefined,
    totalRepsPerSuit: {
      diamonds: zero,
      clubs: zero,
      spades: zero,
      hearts: zero,
    },
    aceCardsDrawn: zero,
    kingCardsDrawn: zero,
    jokerCardsDrawn: zero,
    unlockedAchievements: [],
    fullDecksCompleted: zero,
    longestStreak: zero,
    currentStreak: zero,
    // repsByExercise has no column on the live profiles table yet — see the
    // file header note. discoverable is real, unlike the zeroed stats above.
    repsByExercise: [],
    discoverable: row.discoverable,
  };
}

async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

/** Rounds to ~3 decimal places (~100m precision) — never store/serve a user's exact GPS point. */
function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export const remoteBackend: backendInterface = {
  ...localBackend,

  registerUser: async (
    username: string,
    email: string,
    passwordHash: string,
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password: passwordHash,
      options: { data: { username } },
    });
    if (error) return { __kind__: "err", err: error.message };
    // The on_auth_user_created trigger creates the profiles row (with the
    // username from this metadata) server-side — nothing left to do here.
    return { __kind__: "ok", ok: null };
  },

  loginUser: async (email: string, passwordHash: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: passwordHash,
    });
    if (error || !data.user) {
      return {
        __kind__: "err",
        err: error?.message ?? "Invalid email or password",
      };
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();
    if (profileError || !profile) {
      return {
        __kind__: "err",
        err: "Account exists but profile could not be loaded",
      };
    }
    return { __kind__: "ok", ok: dbProfileToUserProfile(profile) };
  },

  getMyProfile: async () => {
    const userId = await getCurrentUserId();
    if (!userId) return { __kind__: "err", err: "Not authenticated" };
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error || !data) return { __kind__: "err", err: "Account not found" };
    return { __kind__: "ok", ok: dbProfileToUserProfile(data) };
  },

  getMyWorkoutHistory: async () => {
    const userId = await getCurrentUserId();
    if (!userId) return { __kind__: "err", err: "Not authenticated" };
    const { data, error } = await supabase
      .from("workout_history")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false });
    if (error) return { __kind__: "err", err: error.message };
    return { __kind__: "ok", ok: (data ?? []).map(dbRowToWorkoutHistoryEntry) };
  },

  saveWorkoutHistory: async (entry: WorkoutHistoryEntry) => {
    const userId = await getCurrentUserId();
    if (!userId) return { __kind__: "err", err: "Not authenticated" };
    // entry.userId is never trusted here — WorkoutSummaryPage.tsx hardcodes
    // it to "anonymous" (it was never meant to be read), and RLS only lets
    // us write rows where user_id = auth.uid() anyway. entry.id is also
    // dropped: it's a client-side `${Date.now()}` string, not a valid uuid,
    // so the table's own gen_random_uuid() default fills it in instead.
    const insert: WorkoutHistoryInsert = {
      user_id: userId,
      completed_at: new Date(Number(entry.completedAt)).toISOString(),
      deck_id: entry.deckId,
      total_reps: Number(entry.totalReps),
      duration_seconds: Number(entry.durationSeconds),
      cards_completed: Number(entry.cardsCompleted),
      calories_burned: Number(entry.caloriesBurned),
      ace_cards_drawn: Number(entry.aceCardsDrawn),
      king_cards_drawn: Number(entry.kingCardsDrawn),
      joker_cards_drawn: Number(entry.jokerCardsDrawn),
      reps_diamonds: Number(entry.repsBySuit.diamonds),
      reps_clubs: Number(entry.repsBySuit.clubs),
      reps_spades: Number(entry.repsBySuit.spades),
      reps_hearts: Number(entry.repsBySuit.hearts),
      is_valid: entry.isValid,
      avg_time_per_card: entry.avgTimePerCard,
      reps_by_exercise: entry.repsByExercise.map(
        ([name, reps]): [string, number] => [name, Number(reps)],
      ),
    };
    const { error } = await supabase.from("workout_history").insert(insert);
    if (error) return { __kind__: "err", err: error.message };
    return { __kind__: "ok", ok: null };
  },

  updateProfile: async (username: string) => {
    const userId = await getCurrentUserId();
    if (!userId) return { __kind__: "err", err: "Not authenticated" };
    const { error } = await supabase
      .from("profiles")
      .update({ username })
      .eq("id", userId);
    if (error) return { __kind__: "err", err: error.message };
    return { __kind__: "ok", ok: null };
  },

  saveOnboarding: async (gender: string, _level: string) => {
    const userId = await getCurrentUserId();
    if (!userId) return { __kind__: "err", err: "Not authenticated" };
    // Only `gender` has a home in the profiles table — `level` and the
    // hasCompletedOnboarding flag stay in localStorage exactly as they do
    // today for every tier, per src/lib/completeSignup.ts.
    const { error } = await supabase
      .from("profiles")
      .update({ gender })
      .eq("id", userId);
    if (error) return { __kind__: "err", err: error.message };
    return { __kind__: "ok", ok: null };
  },

  getOnboarding: async (): Promise<OnboardingData | null> => null,
};

// ─── Nearby athletes ────────────────────────────────────────────────────────

/**
 * Upserts last_active_at (+ coarse last_lat/last_lng, if given) onto the
 * current user's profile row — but only when discoverable is already true.
 * Call on meaningful app events (app open, workout completed). Silently
 * no-ops for guests (no Supabase session) or opted-out users.
 */
export async function updateActivityPing(
  position: { latitude: number; longitude: number } | null,
): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("discoverable")
    .eq("id", userId)
    .single();
  if (!profile?.discoverable) return;

  const update: Database["public"]["Tables"]["profiles"]["Update"] = {
    last_active_at: new Date().toISOString(),
  };
  if (position) {
    update.last_lat = roundCoord(position.latitude);
    update.last_lng = roundCoord(position.longitude);
  }
  await supabase.from("profiles").update(update).eq("id", userId);
}

/** Flips the "Visible to nearby athletes" flag. Turning it off doesn't clear the last-known coordinates, just stops exposing them (nearby_profiles filters on discoverable = true). */
export async function setDiscoverable(
  discoverable: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase
    .from("profiles")
    .update({ discoverable })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export interface NearbyAthlete {
  id: string;
  username: string;
  gender: string | null;
  lastActiveAt: string;
  distanceKm: number;
}

/** Calls the nearby_profiles(lat, lng, radius_km) RPC — server-side filtered to discoverable, active-in-48h, not-blocked-either-way. */
export async function getNearbyProfiles(
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<
  { ok: true; athletes: NearbyAthlete[] } | { ok: false; error: string }
> {
  const { data, error } = await supabase.rpc("nearby_profiles", {
    lat,
    lng,
    radius_km: radiusKm,
  });
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    athletes: (data ?? []).map((row) => ({
      id: row.id,
      username: row.username,
      gender: row.gender,
      lastActiveAt: row.last_active_at,
      distanceKm: row.distance_km,
    })),
  };
}

export async function blockUser(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getCurrentUserId();
  if (!me) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase
    .from("blocks")
    .insert({ blocker_id: me, blocked_id: userId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function unblockUser(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getCurrentUserId();
  if (!me) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", me)
    .eq("blocked_id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function reportUser(
  userId: string,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getCurrentUserId();
  if (!me) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase
    .from("reports")
    .insert({ reporter_id: me, reported_id: userId, reason });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Finds or creates the 1:1 thread with otherUserId via the create_or_get_thread RPC — server-side block check AND gender/messaging_preference gating (the recipient's stated preference governs). */
export async function createOrGetThread(
  otherUserId: string,
): Promise<{ ok: true; threadId: string } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("create_or_get_thread", {
    other_user_id: otherUserId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, threadId: data };
}

// ─── Chat ───────────────────────────────────────────────────────────────────

export type MessagingPreference = "same_gender_only" | "anyone" | "no_one";

export async function getMessagingPreference(): Promise<MessagingPreference> {
  const userId = await getCurrentUserId();
  if (!userId) return "same_gender_only";
  const { data } = await supabase
    .from("profiles")
    .select("messaging_preference")
    .eq("id", userId)
    .single();
  return (
    (data?.messaging_preference as MessagingPreference) ?? "same_gender_only"
  );
}

export async function setMessagingPreference(
  preference: MessagingPreference,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase
    .from("profiles")
    .update({ messaging_preference: preference })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export interface ChatThreadSummary {
  threadId: string;
  otherUserId: string;
  otherUsername: string;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  isUnread: boolean;
  muted: boolean;
}

/** Lists the current user's threads, most recent activity first, via the get_my_threads() RPC. */
export async function getThreads(): Promise<
  { ok: true; threads: ChatThreadSummary[] } | { ok: false; error: string }
> {
  const { data, error } = await supabase.rpc("get_my_threads");
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    threads: (data ?? []).map((row) => ({
      threadId: row.thread_id,
      otherUserId: row.other_user_id,
      otherUsername: row.other_username,
      lastMessageBody: row.last_message_body,
      lastMessageAt: row.last_message_at,
      isUnread: row.is_unread,
      muted: row.muted,
    })),
  };
}

/** The other participant's (id, username) for a thread you're part of — via the get_thread_peer() RPC, since profiles RLS otherwise only allows reading your own row. */
export async function getThreadPeer(
  threadId: string,
): Promise<
  { ok: true; id: string; username: string } | { ok: false; error: string }
> {
  const { data, error } = await supabase.rpc("get_thread_peer", {
    p_thread_id: threadId,
  });
  if (error) return { ok: false, error: error.message };
  const peer = data?.[0];
  if (!peer) return { ok: false, error: "Thread not found" };
  return { ok: true, id: peer.id, username: peer.username };
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export async function getMessages(
  threadId: string,
): Promise<
  { ok: true; messages: ChatMessage[] } | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    messages: (data ?? []).map((row) => ({
      id: row.id,
      threadId: row.thread_id,
      senderId: row.sender_id,
      body: row.body,
      createdAt: row.created_at,
    })),
  };
}

/** Rate limit (20/min) and a baseline keyword filter are enforced server-side by a trigger — this surfaces whatever error it raises. */
export async function sendMessage(
  threadId: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };
  const { error } = await supabase
    .from("chat_messages")
    .insert({ thread_id: threadId, sender_id: userId, body });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markThreadRead(threadId: string): Promise<void> {
  await supabase.rpc("mark_thread_read", { p_thread_id: threadId });
}

export async function setThreadMuted(
  threadId: string,
  muted: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc("set_thread_muted", {
    p_thread_id: threadId,
    p_muted: muted,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Subscribes to new messages in a thread via Supabase Realtime. Returns an unsubscribe function. */
export function subscribeToThreadMessages(
  threadId: string,
  onMessage: (message: ChatMessage) => void,
): () => void {
  const channel = supabase
    .channel(`chat_messages:${threadId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `thread_id=eq.${threadId}`,
      },
      (payload) => {
        const row =
          payload.new as Database["public"]["Tables"]["chat_messages"]["Row"];
        onMessage({
          id: row.id,
          threadId: row.thread_id,
          senderId: row.sender_id,
          body: row.body,
          createdAt: row.created_at,
        });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
