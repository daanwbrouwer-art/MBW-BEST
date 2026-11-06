// Syncs saved Build-Your-Own decks with the signed-in account (custom_decks
// table), so they survive a reinstall or a new phone.
//
// The device copy (store/customWorkout.ts) stays the source the app reads
// from, so decks keep working offline. Every save, rename and delete is sent
// to the server in the background; pullCustomDecks() reconciles both sides on
// sign-in and app start (newest edit wins; deletions made offline are
// remembered in `deletedIds` and replayed).
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

async function signedInUserId(): Promise<string | null> {
  if (localStorage.getItem("mbw_user") === null) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
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

function markSynced(deckId: string): void {
  useCustomWorkoutStore.setState((s) => ({
    decks: s.decks.map((d) => (d.id === deckId ? { ...d, synced: true } : d)),
  }));
}

/** Background push of one saved or edited deck. Never throws. */
export async function pushDeck(deck: CustomDeck): Promise<void> {
  try {
    const userId = await signedInUserId();
    if (!userId) return;
    await upsertRemote(deck, userId);
    markSynced(deck.id);
  } catch (err) {
    console.warn("Couldn't sync custom deck:", err);
  }
}

/** Background delete of one deck. If it fails, pullCustomDecks retries. */
export async function pushDeckDelete(deckId: string): Promise<void> {
  try {
    const userId = await signedInUserId();
    if (!userId) return;
    const { error } = await supabase
      .from("custom_decks")
      .delete()
      .eq("id", deckId);
    if (error) throw new Error(error.message);
    useCustomWorkoutStore.setState((s) => ({
      deletedIds: s.deletedIds.filter((id) => id !== deckId),
    }));
  } catch (err) {
    console.warn("Couldn't delete custom deck on the server:", err);
  }
}

/** Reconciles this device's decks with the account. */
export async function pullCustomDecks(): Promise<void> {
  const userId = await signedInUserId();
  if (!userId) return;

  const { deletedIds } = useCustomWorkoutStore.getState();
  const stillDeleted: string[] = [];
  for (const id of deletedIds) {
    const { error } = await supabase.from("custom_decks").delete().eq("id", id);
    if (error) stillDeleted.push(id);
  }

  const { data, error } = await supabase
    .from("custom_decks")
    .select("id, name, exercises, created_at, updated_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const remote = new Map(
    ((data ?? []) as CustomDeckRow[])
      .filter((row) => !stillDeleted.includes(row.id))
      .map((row) => [row.id, rowToDeck(row)]),
  );
  // Read the store again: the user may have edited decks while we waited.
  const local = useCustomWorkoutStore.getState().decks;
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
    deletedIds: stillDeleted,
  });

  for (const deck of toPush) {
    try {
      await upsertRemote(deck, userId);
      markSynced(deck.id);
    } catch (err) {
      console.warn("Couldn't upload custom deck:", err);
    }
  }
}
