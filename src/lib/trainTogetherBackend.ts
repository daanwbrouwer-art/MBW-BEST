import { buildCustomWorkoutSteps } from "@/lib/customWorkoutBuilder";
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
import type { CustomWorkoutExercise } from "@/store/customWorkout";

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

/**
 * A saved Custom Workout Builder deck (src/store/customWorkout.ts's
 * `CustomDeck`), snapshotted onto the session row when the host picks it in
 * `WorkoutSetupSheet` — a participant's device has no local copy of the
 * host's saved deck, so the actual exercise list has to travel through
 * Supabase to reach everyone, the same way `cardSequence` already does for
 * the built-in deckCategory path. `id`/`name` are carried through for
 * display (the waiting-room label); `exercises` is what
 * `buildCustomWorkoutSteps()` actually consumes to build `cardSequence`
 * once the host starts the session.
 */
export interface TrainTogetherCustomDeck {
  id: string;
  name: string;
  exercises: CustomWorkoutExercise[];
}

export interface TrainTogetherSession {
  id: string;
  hostId: string;
  deckCategory: TrainTogetherDeckCategory;
  cardCount: number;
  excludedExercises: string[];
  /** Non-null when the host chose a saved custom deck instead of a built-in category — takes priority over deckCategory/cardCount/excludedExercises wherever a session's deck choice matters (setup display, waiting-room label, and what startTrainTogetherSession() draws from). */
  customDeck: TrainTogetherCustomDeck | null;
  cardSequence: CustomWorkoutStep[] | null;
  currentCardIndex: number;
  /** Who the current card (currentCardIndex) is claimed for — null means unclaimed, so every device shows the "who's up?" picker instead of the exercise's Next button until someone picks. Cleared back to null by train_together_advance_card() whenever the index moves, so each new card starts unclaimed again. */
  currentCardOwnerId: string | null;
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
    customDeck: row.custom_deck as TrainTogetherCustomDeck | null,
    cardSequence: row.card_sequence as CustomWorkoutStep[] | null,
    currentCardIndex: row.current_card_index,
    currentCardOwnerId: row.current_card_owner_id,
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
export interface TrainTogetherPartySetup {
  deckCategory: TrainTogetherCategory;
  cardCount: number;
  excludedExercises: string[];
  /** Set instead of (not in addition to) deckCategory when the host picks a saved custom deck — see TrainTogetherCustomDeck. Null clears back to the built-in-deck path. */
  customDeck: TrainTogetherCustomDeck | null;
}

export async function updatePartySetup(
  sessionId: string,
  setup: TrainTogetherPartySetup,
): Promise<void> {
  const { error } = await supabase
    .from("train_together_sessions")
    .update({
      deck_category: setup.deckCategory,
      card_count: setup.cardCount,
      excluded_exercises: setup.excludedExercises,
      custom_deck:
        setup.customDeck as unknown as TrainTogetherSessionRow["custom_deck"],
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

/**
 * Host-only: flips the session to active and draws the one shared card
 * sequence everyone's device renders off. Same "host computes once, writes
 * the full array, everyone else just reads it" mechanism either way —
 * drawTrainTogetherSteps() shuffles (Math.random()), so it was never
 * something each device could reproduce independently even for the
 * built-in path; buildCustomWorkoutSteps() is pure/deterministic, but
 * participants have no local copy of the host's custom deck to run it on
 * regardless (see TrainTogetherCustomDeck), so it goes through the exact
 * same cardSequence broadcast rather than a separate per-device path.
 */
export async function startTrainTogetherSession(
  session: TrainTogetherSession,
): Promise<void> {
  const cardSequence = session.customDeck
    ? buildCustomWorkoutSteps(session.customDeck.exercises)
    : drawTrainTogetherSteps(
        session.deckCategory as TrainTogetherCategory,
        session.cardCount,
        new Set(session.excludedExercises),
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
 * Claims the current card (identified by `expectedIndex`, guarding against
 * two people tapping different participants at once) for `ownerUserId` —
 * the "who's up?" picker shown for a still-unclaimed card. Once this
 * succeeds, every device sees the same owner via the realtime session
 * subscription and shows that person's turn instead of the picker.
 */
export async function assignCardOwner(params: {
  sessionId: string;
  expectedIndex: number;
  ownerUserId: string;
}): Promise<void> {
  const { error } = await supabase.rpc("train_together_assign_card_owner", {
    p_session_id: params.sessionId,
    p_expected_index: params.expectedIndex,
    p_owner_user_id: params.ownerUserId,
  });
  if (error) throw new Error(error.message);
}

/**
 * The core "Next" action, called once the current card already has an
 * owner (see assignCardOwner) — credits that already-known owner and
 * atomically advances the one shared card position for the whole party,
 * clearing the owner so the next card starts unclaimed. `expectedIndex`
 * guards against two people tapping Next at once — see
 * train_together_advance_card() in the migration for the race handling.
 */
export async function attributeCardAndAdvance(params: {
  sessionId: string;
  expectedIndex: number;
  reps: number;
  holdSeconds: number;
}): Promise<void> {
  const { error } = await supabase.rpc("train_together_advance_card", {
    p_session_id: params.sessionId,
    p_expected_index: params.expectedIndex,
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
