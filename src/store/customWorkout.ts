// Lightweight, self-contained store for the Custom Workout builder — kept
// separate from the main `useWorkoutStore` (card-deck engine) since a
// user-assembled exercise list doesn't carry suits/ranks/modifiers and
// shouldn't be coerced into that shape. Persisted so an in-progress
// selection survives an accidental refresh while browsing.
//
// `selected` is the working state for "the deck currently being built or
// edited" — CustomWorkoutBuilderPage.tsx is the single editor for it,
// whether starting fresh (`/custom-workout/new`) or editing an existing
// saved deck (`/custom-workout/edit/$deckId`, via loadDeckIntoSelected).
// `decks` is the persisted list of named, saved decks a session actually
// runs from (CustomWorkoutSessionPage.tsx reads a deck by id, never
// `selected` directly) — see CustomDecksPage.tsx / CustomDeckDetailPage.tsx.
import { pushDeck, pushDeckDelete } from "@/lib/customDeckSync";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const STORE_KEY = "mbw_custom_workout_draft";

/**
 * Signed-in accounts and guest mode keep separate decks on the device: the
 * store reads and writes STORE_KEY while signed in and STORE_KEY + "_guest"
 * otherwise. Call reloadCustomDecks() after signing in or out so the store
 * shows the right set.
 */
function scopedKey(name: string): string {
  return localStorage.getItem("mbw_user") !== null ? name : `${name}_guest`;
}

const scopedStorage = createJSONStorage(() => ({
  getItem: (name) => localStorage.getItem(scopedKey(name)),
  setItem: (name, value) => localStorage.setItem(scopedKey(name), value),
  removeItem: (name) => localStorage.removeItem(scopedKey(name)),
}));

export interface CustomWorkoutExercise {
  name: string;
  isIsometric: boolean;
  /** Reps if not isometric, seconds to hold if isometric. */
  value: number;
  eachSide: boolean;
}

export interface CustomDeck {
  id: string;
  name: string;
  exercises: CustomWorkoutExercise[];
  createdAt: string;
  /** Last edit (ISO). Missing on decks saved before account sync existed. */
  updatedAt?: string;
  /** True once the account has a copy (see lib/customDeckSync.ts). */
  synced?: boolean;
}

interface CustomWorkoutState {
  selected: CustomWorkoutExercise[];
  isSelected: (name: string) => boolean;
  addExercise: (exercise: CustomWorkoutExercise) => void;
  removeExercise: (name: string) => void;
  setValue: (name: string, value: number) => void;
  clear: () => void;

  decks: CustomDeck[];
  getDeck: (deckId: string) => CustomDeck | undefined;
  /** Copies a saved deck's exercises into `selected` so the picker can edit them — no-ops to an empty selection if the deck doesn't exist (e.g. a stale link after deletion). */
  loadDeckIntoSelected: (deckId: string) => void;
  /** Saves the current `selected` as a brand-new named deck. Returns the new deck's id so the caller can navigate straight to it. */
  saveSelectedAsNewDeck: (name: string) => string;
  /** Overwrites an existing deck's exercises with the current `selected` — used when saving an edit, no rename involved. */
  saveSelectedToDeck: (deckId: string) => void;
  renameDeck: (deckId: string, name: string) => void;
  deleteDeck: (deckId: string) => void;
  /** Deck ids deleted on this device that the server hasn't confirmed yet. */
  deletedIds: string[];
}

/** The account keeps at most this many saved decks (custom_decks_limit). */
export const MAX_CUSTOM_DECKS = 100;

const MIN_VALUE = 1;
const MAX_VALUE = 300;

export const useCustomWorkoutStore = create<CustomWorkoutState>()(
  persist(
    (set, get) => {
      // Applies an edit to one saved deck and syncs it in the background.
      const updateDeck = (deckId: string, patch: Partial<CustomDeck>) => {
        const updatedAt = new Date().toISOString();
        set((state) => ({
          decks: state.decks.map((d) =>
            d.id === deckId ? { ...d, ...patch, updatedAt } : d,
          ),
        }));
        const deck = get().decks.find((d) => d.id === deckId);
        if (deck) void pushDeck(deck);
      };
      return {
      selected: [],
      isSelected: (name) => get().selected.some((e) => e.name === name),
      addExercise: (exercise) =>
        set((state) =>
          state.selected.some((e) => e.name === exercise.name)
            ? state
            : { selected: [...state.selected, exercise] },
        ),
      removeExercise: (name) =>
        set((state) => ({
          selected: state.selected.filter((e) => e.name !== name),
        })),
      setValue: (name, value) =>
        set((state) => ({
          selected: state.selected.map((e) =>
            e.name === name
              ? { ...e, value: Math.min(MAX_VALUE, Math.max(MIN_VALUE, value)) }
              : e,
          ),
        })),
      clear: () => set({ selected: [] }),

      decks: [],
      getDeck: (deckId) => get().decks.find((d) => d.id === deckId),
      loadDeckIntoSelected: (deckId) => {
        const deck = get().decks.find((d) => d.id === deckId);
        set({
          selected: deck ? deck.exercises.map((e) => ({ ...e })) : [],
        });
      },
      saveSelectedAsNewDeck: (name) => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const deck: CustomDeck = {
          id,
          name,
          exercises: get().selected,
          createdAt: now,
          updatedAt: now,
          synced: false,
        };
        set((state) => ({ decks: [...state.decks, deck] }));
        void pushDeck(deck);
        return id;
      },
      saveSelectedToDeck: (deckId) => updateDeck(deckId, { exercises: get().selected }),
      renameDeck: (deckId, name) => updateDeck(deckId, { name }),
      deleteDeck: (deckId) => {
        const existed = get().decks.some((d) => d.id === deckId);
        set((state) => ({
          decks: state.decks.filter((d) => d.id !== deckId),
          deletedIds: existed ? [...state.deletedIds, deckId] : state.deletedIds,
        }));
        if (existed) void pushDeckDelete(deckId);
      },
      deletedIds: [],
    };
    },
    { name: STORE_KEY, storage: scopedStorage },
  ),
);

/** Loads the decks for whoever is using the device now (account or guest). */
export function reloadCustomDecks(): void {
  let saved: Partial<
    Pick<CustomWorkoutState, "selected" | "decks" | "deletedIds">
  > = {};
  try {
    const raw = localStorage.getItem(scopedKey(STORE_KEY));
    saved = raw ? (JSON.parse(raw).state ?? {}) : {};
  } catch {
    saved = {};
  }
  useCustomWorkoutStore.setState({
    selected: saved.selected ?? [],
    decks: saved.decks ?? [],
    deletedIds: saved.deletedIds ?? [],
  });
}

/**
 * Sign-up: gives the new account the decks made in guest mode (a trial can
 * build decks), unless the account already has some on this device.
 */
export function migrateGuestCustomDecks(): void {
  const guestKey = `${STORE_KEY}_guest`;
  const guestRaw = localStorage.getItem(guestKey);
  if (!guestRaw) return;
  if (!localStorage.getItem(STORE_KEY)) {
    localStorage.setItem(STORE_KEY, guestRaw);
  }
  localStorage.removeItem(guestKey);
}
