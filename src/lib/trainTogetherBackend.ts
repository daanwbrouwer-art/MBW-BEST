// Data-access layer for "Train Together" v2 — friends, parties of 2-4, and
// the single shared realtime session — against the MAIN Supabase project
// (src/lib/supabaseClient.ts), the same one real accounts/subscriptions live
// on. This replaces the old v1 layer that talked to a separate,
// anonymous-auth-only project; Train Together now requires a real signed-in
// account like everything else gated behind a subscription.
//
// Functions throw on unexpected Supabase errors (callers use react-query /
// try-catch) and return null for expected "not found" lookups.
import type { Tables } from "@/lib/database.types";
import { supabase } from "@/lib/supabaseClient";
import {
  type CustomWorkoutStep,
  type TrainTogetherCategory,
  drawTrainTogetherSteps,
} from "@/lib/trainTogetherDraw";

type FriendshipRow = Tables<"friendships">;
type TrainTogetherSessionRow = Tables<"train_together_sessions">;
type TrainTogetherParticipantRow =
  Tables<"train_together_session_participants">;

// The DB check constraints on these columns aren't reflected in the
// generated types (Postgres check constraints don't become TS literal
// unions), so the app-facing types below are narrower than the raw
// `deck_category: string` / `status: string` on TrainTogetherSessionRow —
// cast at the toSession() boundary, same pattern as trainTogetherDraw.ts.
export type TrainTogetherDeckCategory =
  | "UpperBody"
  | "LowerBody"
  | "FullBody"
  | "Core";
export type TrainTogetherSessionStatus =
  | "waiting"
  | "active"
  | "completed"
  | "cancelled";

// Excludes 0/O/1/I — ambiguous when read aloud or handwritten off a screen.
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateInviteCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("You need to be signed in to use Train Together.");
  }
  return userId;
}

// ─── Friends ────────────────────────────────────────────────────────────

export interface FoundProfile {
  id: string;
  username: string;
}

/** Looks up a profile by exact username (case-insensitive). Returns null if not found or if it's the caller's own profile. */
export async function findProfileByUsername(
  handle: string,
): Promise<FoundProfile | null> {
  const userId = await getCurrentUserId();
  const needle = handle.trim();
  if (!needle) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .ilike("username", needle)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.id === userId || !data.username) return null;
  return { id: data.id, username: data.username };
}

export type FriendshipDirection = "incoming" | "outgoing";

export interface FriendshipEntry {
  friendshipId: string;
  status: "pending" | "accepted" | "declined";
  direction: FriendshipDirection;
  otherUserId: string;
  otherUsername: string;
}

/** All of the current user's friendships (accepted + pending, both directions), with the other party's username resolved. */
export async function listFriendships(): Promise<FriendshipEntry[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as FriendshipRow[];
  if (rows.length === 0) return [];

  const otherIds = rows.map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id,
  );
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", otherIds);
  if (profilesError) throw new Error(profilesError.message);
  const usernameById = new Map(
    (profiles ?? []).map((p) => [p.id as string, p.username as string]),
  );

  return rows.map((f) => {
    const isRequester = f.requester_id === userId;
    const otherUserId = isRequester ? f.addressee_id : f.requester_id;
    return {
      friendshipId: f.id,
      status: f.status as FriendshipEntry["status"],
      direction: isRequester ? "outgoing" : "incoming",
      otherUserId,
      otherUsername: usernameById.get(otherUserId) ?? "Unknown",
    };
  });
}

export async function sendFriendRequest(addresseeId: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: userId, addressee_id: addresseeId });
  if (error) throw new Error(error.message);
}

export async function respondToFriendRequest(
  friendshipId: string,
  accept: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("friendships")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", friendshipId);
  if (error) throw new Error(error.message);
}

// ─── Party / session setup ─────────────────────────────────────────────

export interface TrainTogetherSession {
  id: string;
  hostId: string;
  deckCategory: TrainTogetherDeckCategory;
  cardCount: number;
  excludedExercises: string[];
  cardSequence: CustomWorkoutStep[] | null;
  currentCardIndex: number;
  cardStartedAt: string | null;
  inviteCode: string;
  status: TrainTogetherSessionStatus;
}

function toSession(row: TrainTogetherSessionRow): TrainTogetherSession {
  return {
    id: row.id,
    hostId: row.host_id,
    deckCategory: row.deck_category as TrainTogetherDeckCategory,
    cardCount: row.card_count,
    excludedExercises: row.excluded_exercises,
    cardSequence: row.card_sequence as CustomWorkoutStep[] | null,
    currentCardIndex: row.current_card_index,
    cardStartedAt: row.card_started_at,
    inviteCode: row.invite_code,
    status: row.status as TrainTogetherSessionStatus,
  };
}

/** Creates a "waiting" party of just the host — deck/card count/exclusions get set later via updatePartySetup, once everyone invited has accepted, matching the flow: pick people first, configure the workout second. */
export async function createTrainTogetherParty(): Promise<TrainTogetherSession> {
  const userId = await requireUserId();

  let lastError: string | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("train_together_sessions")
      .insert({
        host_id: userId,
        deck_category: "FullBody",
        card_count: 52,
        invite_code: generateInviteCode(),
      })
      .select("*")
      .single();
    if (!error && data) {
      const session = data as unknown as TrainTogetherSessionRow;
      const { error: joinError } = await supabase
        .from("train_together_session_participants")
        .insert({
          session_id: session.id,
          user_id: userId,
          invite_status: "accepted",
          is_ready: false,
        });
      if (joinError) throw new Error(joinError.message);
      return toSession(session);
    }
    if (error?.code !== "23505") throw new Error(error?.message);
    lastError = error.message;
  }
  throw new Error(lastError ?? "Couldn't create a party. Try again.");
}

/** Host invites an existing friend/profile straight into the party (pending until they accept). */
export async function inviteToParty(
  sessionId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("train_together_session_participants")
    .upsert(
      { session_id: sessionId, user_id: userId, invite_status: "pending" },
      { onConflict: "session_id,user_id", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}

export async function getSessionByInviteCode(
  code: string,
): Promise<TrainTogetherSession | null> {
  const { data, error } = await supabase
    .from("train_together_sessions")
    .select("*")
    .ilike("invite_code", code.trim())
    .eq("status", "waiting")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toSession(data as unknown as TrainTogetherSessionRow) : null;
}

export async function getTrainTogetherSession(
  sessionId: string,
): Promise<TrainTogetherSession | null> {
  const { data, error } = await supabase
    .from("train_together_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toSession(data as unknown as TrainTogetherSessionRow) : null;
}

/** Joins a party directly via invite code, e.g. from a shared link, bypassing the friend-invite step — arrives already accepted since typing/opening the code is itself the acceptance. */
export async function joinPartyByCode(sessionId: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("train_together_session_participants")
    .upsert(
      {
        session_id: sessionId,
        user_id: userId,
        invite_status: "accepted",
      },
      { onConflict: "session_id,user_id", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}

/** The invited user accepting/declining a pending party invite. */
export async function respondToPartyInvite(
  sessionId: string,
  accept: boolean,
): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("train_together_session_participants")
    .update({ invite_status: accept ? "accepted" : "declined" })
    .eq("session_id", sessionId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/** Pending party invites for the current user, across any "waiting" session. */
export interface PendingPartyInvite {
  sessionId: string;
  hostUsername: string;
}

export async function listPendingPartyInvites(): Promise<PendingPartyInvite[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("train_together_session_participants")
    .select(
      "session_id, invite_status, train_together_sessions!inner(id, status, host_id)",
    )
    .eq("user_id", userId)
    .eq("invite_status", "pending");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as {
    session_id: string;
    train_together_sessions: { status: string; host_id: string };
  }[];
  const waiting = rows.filter(
    (r) => r.train_together_sessions.status === "waiting",
  );
  if (waiting.length === 0) return [];

  const hostIds = waiting.map((r) => r.train_together_sessions.host_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", hostIds);
  if (profilesError) throw new Error(profilesError.message);
  const usernameById = new Map(
    (profiles ?? []).map((p) => [p.id as string, p.username as string]),
  );

  return waiting.map((r) => ({
    sessionId: r.session_id,
    hostUsername:
      usernameById.get(r.train_together_sessions.host_id) ?? "Someone",
  }));
}

/** Host-only: sets the deck, card count, and excluded exercises before starting. */
export async function updatePartySetup(
  sessionId: string,
  setup: {
    deckCategory: TrainTogetherCategory;
    cardCount: number;
    excludedExercises: string[];
  },
): Promise<void> {
  const { error } = await supabase
    .from("train_together_sessions")
    .update({
      deck_category: setup.deckCategory,
      card_count: setup.cardCount,
      excluded_exercises: setup.excludedExercises,
    })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
}

export async function setParticipantReady(
  sessionId: string,
  isReady: boolean,
): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("train_together_session_participants")
    .update({ is_ready: isReady })
    .eq("session_id", sessionId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export interface TrainTogetherParticipant {
  id: string;
  userId: string;
  username: string;
  inviteStatus: "pending" | "accepted" | "declined";
  isReady: boolean;
  cardsCompleted: number;
  totalSeconds: number;
  totalReps: number;
  totalHoldSeconds: number;
}

export async function listSessionParticipants(
  sessionId: string,
): Promise<TrainTogetherParticipant[]> {
  const { data, error } = await supabase
    .from("train_together_session_participants")
    .select(
      "id, user_id, invite_status, is_ready, cards_completed, total_seconds, total_reps, total_hold_seconds",
    )
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as TrainTogetherParticipantRow[];
  if (rows.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username")
    .in(
      "id",
      rows.map((p) => p.user_id),
    );
  if (profilesError) throw new Error(profilesError.message);
  const usernameById = new Map(
    (profiles ?? []).map((p) => [p.id as string, p.username as string]),
  );

  return rows.map((p) => ({
    id: p.id,
    userId: p.user_id,
    username: usernameById.get(p.user_id) ?? "Unknown",
    inviteStatus: p.invite_status as TrainTogetherParticipant["inviteStatus"],
    isReady: p.is_ready,
    cardsCompleted: p.cards_completed,
    totalSeconds: p.total_seconds,
    totalReps: p.total_reps,
    totalHoldSeconds: p.total_hold_seconds,
  }));
}

/** Host-only: flips the session to active and draws the one shared card sequence everyone's device renders off. */
export async function startTrainTogetherSession(
  session: TrainTogetherSession,
): Promise<void> {
  const excluded = new Set(session.excludedExercises);
  const cardSequence = drawTrainTogetherSteps(
    session.deckCategory as TrainTogetherCategory,
    session.cardCount,
    excluded,
  );
  const { error } = await supabase
    .from("train_together_sessions")
    .update({
      status: "active",
      card_sequence:
        cardSequence as unknown as TrainTogetherSessionRow["card_sequence"],
      current_card_index: 0,
      card_started_at: new Date().toISOString(),
    })
    .eq("id", session.id);
  if (error) throw new Error(error.message);
}

/**
 * The core "Next" action: attributes the just-finished card to
 * `participantUserId` (whoever the "who is this for?" picker landed on) and
 * atomically advances the one shared card position for the whole party.
 * `expectedIndex` guards against two people tapping Next at once — see
 * train_together_advance_card() in the migration for the race handling.
 */
export async function attributeCardAndAdvance(params: {
  sessionId: string;
  expectedIndex: number;
  participantUserId: string;
  reps: number;
  holdSeconds: number;
}): Promise<void> {
  const { error } = await supabase.rpc("train_together_advance_card", {
    p_session_id: params.sessionId,
    p_expected_index: params.expectedIndex,
    p_participant_user_id: params.participantUserId,
    p_reps: params.reps,
    p_hold_seconds: params.holdSeconds,
  });
  if (error) throw new Error(error.message);
}

// ─── Realtime ───────────────────────────────────────────────────────────

/** Subscribes to this session's own row (current_card_index, status transitions). Returns an unsubscribe function. */
export function subscribeToSession(
  sessionId: string,
  onChange: (session: TrainTogetherSession) => void,
): () => void {
  const channel = supabase
    .channel(`train_together_session:${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "train_together_sessions",
        filter: `id=eq.${sessionId}`,
      },
      (payload) =>
        onChange(toSession(payload.new as unknown as TrainTogetherSessionRow)),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** Subscribes to every participant-row change (invite/ready/stats) within a session. Callers should re-fetch listSessionParticipants() on each event rather than trust payload.new alone, since usernames aren't in this table. Returns an unsubscribe function. */
export function subscribeToSessionParticipants(
  sessionId: string,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel(`train_together_participants:${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "train_together_session_participants",
        filter: `session_id=eq.${sessionId}`,
      },
      () => onChange(),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
