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

async function upsertRemote(deck: CustomDeck, userId: string): Promise<void> {
  const { error } = await supabase.from("custom_decks").upsert({
    id: deck.id,
    user_id: userId,
    name: deck.name,
    exercises: deck.exercises as unknown as Json,
    created_at: deck.createdAt,
    updated_at: deck.updatedAt ?? deck.createdAt,
  });
  if (error) throw new Error(error.message);
}

function markSynced(scope: AccountScope, deckId: string): void {
  if (!isScopeCurrent(scope)) return;
  useCustomWorkoutStore.setState((s) => ({
    decks: s.decks.map((d) => (d.id === deckId ? { ...d, synced: true } : d)),
  }));
}

/** Background push of one saved or edited deck. Never throws. */
export async function pushDeck(deck: CustomDeck): Promise<void> {
  try {
    const scope = await activeScope();
    if (!scope) return;
    await upsertRemote(deck, scope.userId);
    markSynced(scope, deck.id);
  } catch (err) {
    console.warn("Couldn't sync custom deck:", err);
  }
}

/** Background delete of one deck. If it fails, pullCustomDecks retries. */
export async function pushDeckDelete(deckId: string): Promise<void> {
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
  // Replay deletions the server hasn't confirmed yet.
  const confirmedDeleted: string[] = [];
  for (const id of useCustomWorkoutStore.getState().deletedIds) {
    const { error } = await supabase.from("custom_decks").delete().eq("id", id);
    if (!error) confirmedDeleted.push(id);
  }

  const { data, error } = await supabase
    .from("custom_decks")
    .select("id, name, exercises, created_at, updated_at")
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
  const toPush: CustomDeck[] = [];
  for (const deck of local) {
    const theirs = remote.get(deck.id);
    // Synced before but gone from the account: deleted on another device.
    if (!theirs && deck.synced) continue;
    if (!theirs || deckUpdatedAt(deck) > deckUpdatedAt(theirs)) {
      merged.set(deck.id, deck);
      toPush.push(deck);
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

  for (const deck of toPush) {
    try {
      await upsertRemote(deck, scope.userId);
      markSynced(scope, deck.id);
    } catch (err) {
      console.warn("Couldn't upload custom deck:", err);
    }
  }
}
