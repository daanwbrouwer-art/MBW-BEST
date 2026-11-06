// Syncs saved Build-Your-Own decks with the signed-in account (custom_decks
// table), so they survive a reinstall or a new phone.
//
// The device copy (store/customWorkout.ts) stays the source the app reads
// from, so decks keep working offline. Every save, rename and delete is sent
// to the server in the background; pullCustomDecks() reconciles both sides on
// sign-in, app start and sign-out:
//  - newest edit wins;
//  - a deck that was synced before but is gone from the account was deleted
//    on another device, so it is dropped here too;
//  - deletions made here that the server hasn't confirmed are kept in
//    `deletedIds` and replayed, and never come back from the server.
import {
  type AccountScope,
  OWNER_KEY,
  captureScope,
  isScopeCurrent,
} from "@/lib/accountScope";
import type { Json } from "@/lib/database.types";
import { supabase } from "@/lib/supabaseClient";
import {
  type CustomDeck,
  type CustomWorkoutExercise,
  useCustomWorkoutStore,
} from "@/store/customWorkout";

interface CustomDeckRow {
  id: string;
  name: string;
  exercises: Json;
  created_at: string;
  updated_at: string;
}

/** The signed-in account this device belongs to, or null (guest/signed out). */
async function activeScope(): Promise<AccountScope | null> {
  if (localStorage.getItem("mbw_user") === null) return null;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId || localStorage.getItem(OWNER_KEY) !== userId) return null;
  return captureScope(userId);
}

function deckUpdatedAt(deck: CustomDeck): number {
  return new Date(deck.updatedAt ?? deck.createdAt).getTime();
}

function rowToDeck(row: CustomDeckRow): CustomDeck {
  return {
    id: row.id,
    name: row.name,
    exercises: row.exercises as unknown as CustomWorkoutExercise[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    synced: true,
  };
}

/**
 * Sends one deck to the account. A deck that was synced before is only
 * updated, never re-created: if its row is gone, another device deleted it
 * and the delete wins ("gone"). A deck the account never had is inserted.
 */
async function writeRemote(
  deck: CustomDeck,
  userId: string,
): Promise<"ok" | "gone"> {
  const fields = {
    name: deck.name,
    exercises: deck.exercises as unknown as Json,
    updated_at: deck.updatedAt ?? deck.createdAt,
  };
  if (deck.synced) {
    const { data, error } = await supabase
      .from("custom_decks")
      .update(fields)
      .eq("id", deck.id)
      .eq("user_id", userId)
      .select("id");
    if (error) throw new Error(error.message);
    return data && data.length > 0 ? "ok" : "gone";
  }
  const { error } = await supabase.from("custom_decks").upsert({
    ...fields,
    id: deck.id,
    user_id: userId,
    created_at: deck.createdAt,
  });
  if (error) throw new Error(error.message);
  return "ok";
}

/** Applies a write's outcome to the device copy (if still that account's). */
function applyResult(
  scope: AccountScope,
  deckId: string,
  result: "ok" | "gone",
): void {
  if (!isScopeCurrent(scope)) return;
  useCustomWorkoutStore.setState((s) => ({
    decks:
      result === "gone"
        ? s.decks.filter((d) => d.id !== deckId)
        : s.decks.map((d) => (d.id === deckId ? { ...d, synced: true } : d)),
  }));
}

// Uploads in flight per deck id: a delete waits for them, or a slow upload
// landing after the delete would re-create the deck.
const pushesInFlight = new Map<string, Promise<void>>();

/** Background push of one saved or edited deck. Never throws. */
export function pushDeck(deck: CustomDeck): Promise<void> {
  const previous = pushesInFlight.get(deck.id) ?? Promise.resolve();
  const push = previous.then(async () => {
    try {
      const scope = await activeScope();
      if (!scope) return;
      // Deleted while waiting for the previous upload: don't re-create it.
      if (useCustomWorkoutStore.getState().deletedIds.includes(deck.id)) return;
      applyResult(scope, deck.id, await writeRemote(deck, scope.userId));
    } catch (err) {
      console.warn("Couldn't sync custom deck:", err);
    }
  });
  pushesInFlight.set(deck.id, push);
  void push.finally(() => {
    if (pushesInFlight.get(deck.id) === push) pushesInFlight.delete(deck.id);
  });
  return push;
}

/** Background delete of one deck. If it fails, pullCustomDecks retries. */
export async function pushDeckDelete(deckId: string): Promise<void> {
  await pushesInFlight.get(deckId);
  try {
    const scope = await activeScope();
    if (!scope) return;
    const { error } = await supabase
      .from("custom_decks")
      .delete()
      .eq("id", deckId);
    if (error) throw new Error(error.message);
    if (!isScopeCurrent(scope)) return;
    useCustomWorkoutStore.setState((s) => ({
      deletedIds: s.deletedIds.filter((id) => id !== deckId),
    }));
  } catch (err) {
    console.warn("Couldn't delete custom deck on the server:", err);
  }
}

/** Reconciles this device's decks with the account in `scope`. */
export async function pullCustomDecks(scope: AccountScope): Promise<void> {
  // Only for the account whose session this is (RLS answers for whoever
  // the session belongs to, not for `scope`).
  const { data: session } = await supabase.auth.getSession();
  if (session.session?.user.id !== scope.userId || !isScopeCurrent(scope)) {
    return;
  }

  // Replay deletions the server hasn't confirmed yet.
  const confirmedDeleted: string[] = [];
  for (const id of useCustomWorkoutStore.getState().deletedIds) {
    const { error } = await supabase
      .from("custom_decks")
      .delete()
      .eq("id", id)
      .eq("user_id", scope.userId);
    if (!error) confirmedDeleted.push(id);
  }

  const { data, error } = await supabase
    .from("custom_decks")
    .select("id, name, exercises, created_at, updated_at")
    .eq("user_id", scope.userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  if (!isScopeCurrent(scope)) return;

  // Read the store again: the user may have edited or deleted decks while we
  // waited. Anything deleted here (confirmed or not) must not come back.
  const { decks: local, deletedIds } = useCustomWorkoutStore.getState();
  const deletedHere = new Set([...deletedIds, ...confirmedDeleted]);
  const remote = new Map(
    ((data ?? []) as CustomDeckRow[])
      .filter((row) => !deletedHere.has(row.id))
      .map((row) => [row.id, rowToDeck(row)]),
  );

  const merged = new Map<string, CustomDeck>();
  const toPush: string[] = [];
  for (const deck of local) {
    const theirs = remote.get(deck.id);
    // Synced before but gone from the account: deleted on another device
    // (delete wins over an unsent edit made here).
    if (!theirs && deck.synced) continue;
    if (!theirs || deckUpdatedAt(deck) > deckUpdatedAt(theirs)) {
      // Never marked synced while the account lacks it: a missing row then
      // means "insert", not "deleted elsewhere".
      merged.set(deck.id, theirs ? deck : { ...deck, synced: false });
      toPush.push(deck.id);
    } else {
      merged.set(deck.id, theirs);
    }
  }
  for (const [id, deck] of remote) {
    if (!merged.has(id)) merged.set(id, deck);
  }

  useCustomWorkoutStore.setState({
    decks: [...merged.values()].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ),
    deletedIds: deletedIds.filter((id) => !confirmedDeleted.includes(id)),
  });

  for (const id of toPush) {
    // Re-read each time: the user may have edited or deleted it meanwhile
    // (an upload of a deleted deck would bring it back).
    if (!isScopeCurrent(scope)) return;
    const state = useCustomWorkoutStore.getState();
    const deck = state.decks.find((d) => d.id === id);
    if (!deck || state.deletedIds.includes(id)) continue;
    try {
      applyResult(scope, id, await writeRemote(deck, scope.userId));
    } catch (err) {
      console.warn("Couldn't upload custom deck:", err);
    }
  }
}
