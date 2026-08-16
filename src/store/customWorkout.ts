// Lightweight, self-contained store for the Custom Workout builder — kept
// separate from the main `useWorkoutStore` (card-deck engine) since a
// user-assembled exercise list doesn't carry suits/ranks/modifiers and
// shouldn't be coerced into that shape. Persisted so an in-progress
// selection survives an accidental refresh while browsing.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CustomWorkoutExercise {
  name: string;
  isIsometric: boolean;
  /** Reps if not isometric, seconds to hold if isometric. */
  value: number;
  eachSide: boolean;
}

interface CustomWorkoutState {
  selected: CustomWorkoutExercise[];
  isSelected: (name: string) => boolean;
  addExercise: (exercise: CustomWorkoutExercise) => void;
  removeExercise: (name: string) => void;
  setValue: (name: string, value: number) => void;
  clear: () => void;
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
    }),
    { name: "mbw_custom_workout_draft" },
  ),
);
