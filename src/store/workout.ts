import type { CardCount } from "@/backend";
import type { EquipmentProfile } from "@/types/user";
import type {
  Deck,
  DeckCategory,
  DeckDifficulty,
  JokerChallenge,
} from "@/types/workout";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LocalCard {
  id: string;
  rank: string;
  suit: string;
  exerciseName: string;
  reps: number;
  isJoker: boolean;
  isAce: boolean;
  isKing: boolean;
  videoUrl?: string;
  challenge?: JokerChallenge;
  eachLeg?: boolean;
  eachSide?: boolean;
  holdSeconds?: number;
  specialInstruction?: string;
  imagePath?: string;
  /** True when no accurate illustration exists for this exercise yet —
   * render an "Illustration coming soon" placeholder instead of a photo. */
  illustrationComingSoon?: boolean;
  deckCategory?: string;
  /** Set only when this card's exercise, as actually resolved into the
   * deck (post equipment-substitution), genuinely requires a piece of
   * equipment — i.e. the user owned it and the substitute swap did NOT
   * happen. Used to derive real per-session equipment usage for
   * achievements, instead of trusting the pre-session profile toggle. */
  requiresEquipment?: keyof EquipmentProfile;
  jokerComboList?: Array<{
    reps: number;
    exerciseName: string;
    eachLeg?: boolean;
    imagePath?: string;
  }>;
}

export interface LocalSessionCard {
  card: {
    id: string;
    rank: string;
    suit: string;
    exercise: string;
    videoUrl?: string;
    eachLeg?: boolean;
    eachSide?: boolean;
    holdSeconds?: number;
    specialInstruction?: string;
    imagePath?: string;
    illustrationComingSoon?: boolean;
    deckCategory?: string;
    requiresEquipment?: keyof EquipmentProfile;
    jokerComboList?: Array<{
      reps: number;
      exerciseName: string;
      eachLeg?: boolean;
      imagePath?: string;
    }>;
  };
  reps: number;
  isMod?: boolean;
  challenge?: JokerChallenge;
}

interface WorkoutState {
  selectedDeck: Deck | null;
  selectedCategory: DeckCategory | null;
  selectedDifficulty: DeckDifficulty | null;
  selectedCardCount: CardCount | null;
  shuffledDeck: LocalCard[];
  deckIndex: number;
  workoutStartTime: number | null;
  currentCard: LocalSessionCard | null;
  previousCard: LocalSessionCard | null;
  cardHistory: LocalSessionCard[];
  isShuffling: boolean;
  isFlipping: boolean;
  jokerActive: boolean;
  jokerChallenge: JokerChallenge | null;
  isSummary: boolean;
  totalCards: number;
  guestMode: boolean;
  excludedExercises: string[];
  workoutGender: "male" | "female";
  infoPanelOpen: boolean;
}

interface WorkoutActions {
  setSelectedDeck: (deck: Deck | null) => void;
  setSelectedCategory: (category: DeckCategory | null) => void;
  setSelectedDifficulty: (difficulty: DeckDifficulty | null) => void;
  setSelectedCardCount: (count: CardCount | null) => void;
  setExcludedExercises: (exercises: string[]) => void;
  toggleExcludeExercise: (exercise: string) => void;
  setWorkoutGender: (gender: "male" | "female") => void;
  setShuffledDeck: (deck: LocalCard[], cardCount: number) => void;
  advanceDeck: () => void;
  goBackCard: () => void;
  setWorkoutStartTime: (t: number | null) => void;
  setIsShuffling: (v: boolean) => void;
  setIsFlipping: (v: boolean) => void;
  setJokerActive: (v: boolean) => void;
  setJokerChallenge: (c: JokerChallenge | null) => void;
  setIsSummary: (v: boolean) => void;
  setGuestMode: (v: boolean) => void;
  setInfoPanelOpen: (v: boolean) => void;
  reset: () => void;
}

const initialState: WorkoutState = {
  selectedDeck: null,
  selectedCategory: null,
  selectedDifficulty: null,
  selectedCardCount: null,
  shuffledDeck: [],
  deckIndex: -1,
  workoutStartTime: null,
  currentCard: null,
  previousCard: null,
  cardHistory: [],
  isShuffling: false,
  isFlipping: false,
  jokerActive: false,
  jokerChallenge: null,
  isSummary: false,
  totalCards: 0,
  guestMode: false,
  excludedExercises: [],
  workoutGender: "male",
  infoPanelOpen: false,
};

export const useWorkoutStore = create<WorkoutState & WorkoutActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setSelectedDeck: (deck) => set({ selectedDeck: deck }),
      setSelectedCategory: (category) =>
        set({ selectedCategory: category, excludedExercises: [] }),
      setSelectedDifficulty: (difficulty) =>
        set({ selectedDifficulty: difficulty, excludedExercises: [] }),
      setSelectedCardCount: (count) => set({ selectedCardCount: count }),
      setExcludedExercises: (exercises) =>
        set({ excludedExercises: exercises }),
      setWorkoutGender: (gender) => set({ workoutGender: gender }),
      toggleExcludeExercise: (exercise) =>
        set((state) => {
          const already = state.excludedExercises.includes(exercise);
          return {
            excludedExercises: already
              ? state.excludedExercises.filter((e) => e !== exercise)
              : [...state.excludedExercises, exercise],
          };
        }),

      setShuffledDeck: (deck, cardCount) =>
        set({
          shuffledDeck: deck,
          totalCards: cardCount,
          deckIndex: -1,
          currentCard: null,
          previousCard: null,
          cardHistory: [],
          isSummary: false,
        }),

      advanceDeck: () => {
        const { shuffledDeck, deckIndex, currentCard, totalCards } = get();
        const nextIndex = deckIndex + 1;
        if (nextIndex >= totalCards) {
          set({ isSummary: true });
          return;
        }
        const nextRaw = shuffledDeck[nextIndex];
        if (!nextRaw) return;

        // Resolve ACE / KING reps from previousCard
        let resolvedReps = nextRaw.reps;
        let resolvedExercise = nextRaw.exerciseName;
        let resolvedEquipment = nextRaw.requiresEquipment;
        if (nextRaw.isAce && currentCard) {
          resolvedReps = currentCard.reps * 2;
          resolvedExercise = currentCard.card.exercise;
          resolvedEquipment = currentCard.card.requiresEquipment;
        } else if (nextRaw.isKing && currentCard) {
          resolvedReps = Math.max(1, Math.ceil(currentCard.reps / 2));
          resolvedExercise = currentCard.card.exercise;
          resolvedEquipment = currentCard.card.requiresEquipment;
        }

        const nextCard: LocalSessionCard = {
          card: {
            id: nextRaw.id,
            rank: nextRaw.rank,
            suit: nextRaw.suit,
            exercise: resolvedExercise,
            videoUrl: nextRaw.videoUrl,
            eachLeg: nextRaw.eachLeg,
            eachSide: nextRaw.eachSide,
            holdSeconds: nextRaw.holdSeconds,
            specialInstruction: nextRaw.specialInstruction,
            imagePath: nextRaw.imagePath,
            illustrationComingSoon: nextRaw.illustrationComingSoon,
            jokerComboList: nextRaw.jokerComboList,
            deckCategory: nextRaw.deckCategory,
            requiresEquipment: resolvedEquipment,
          },
          reps: resolvedReps,
          isMod: nextRaw.isAce || nextRaw.isKing,
          challenge: nextRaw.challenge,
        };

        const { cardHistory } = get();
        set({
          previousCard: currentCard,
          currentCard: nextCard,
          cardHistory: currentCard
            ? [...cardHistory, currentCard]
            : cardHistory,
          deckIndex: nextIndex,
          jokerActive: nextRaw.isJoker,
          jokerChallenge: nextRaw.isJoker ? (nextRaw.challenge ?? null) : null,
        });
      },

      goBackCard: () => {
        const { cardHistory, deckIndex } = get();
        if (cardHistory.length === 0) return;
        const history = [...cardHistory];
        const prevCard = history.pop()!;
        set({
          currentCard: prevCard,
          cardHistory: history,
          deckIndex: Math.max(0, deckIndex - 1),
          jokerActive: false,
          jokerChallenge: null,
        });
      },

      setWorkoutStartTime: (t) => set({ workoutStartTime: t }),
      setIsShuffling: (v) => set({ isShuffling: v }),
      setIsFlipping: (v) => set({ isFlipping: v }),
      setJokerActive: (v) => set({ jokerActive: v }),
      setJokerChallenge: (c) => set({ jokerChallenge: c }),
      setIsSummary: (v) => set({ isSummary: v }),
      setGuestMode: (v) => set({ guestMode: v }),
      setInfoPanelOpen: (v) => set({ infoPanelOpen: v }),
      reset: () => set({ ...initialState, guestMode: get().guestMode }),
    }),
    {
      name: "mbw_workout_store",
      // Only guestMode needs to survive a refresh — in-progress card/session
      // state should not be resumed stale after a reload.
      partialize: (state) => ({ guestMode: state.guestMode }),
    },
  ),
);
