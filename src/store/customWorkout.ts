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
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
}

const MIN_VALUE = 1;
const MAX_VALUE = 300;

export const useCustomWorkoutStore = create<CustomWorkoutState>()(
  persist(
    (set, get) => ({
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
        const deck: CustomDeck = {
          id,
          name,
          exercises: get().selected,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ decks: [...state.decks, deck] }));
        return id;
      },
      saveSelectedToDeck: (deckId) =>
        set((state) => ({
          decks: state.decks.map((d) =>
            d.id === deckId ? { ...d, exercises: state.selected } : d,
          ),
        })),
      renameDeck: (deckId, name) =>
        set((state) => ({
          decks: state.decks.map((d) => (d.id === deckId ? { ...d, name } : d)),
        })),
      deleteDeck: (deckId) =>
        set((state) => ({
          decks: state.decks.filter((d) => d.id !== deckId),
        })),
    }),
    { name: "mbw_custom_workout_draft" },
  ),
);
