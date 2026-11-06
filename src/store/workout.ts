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

/** A King never halves a hold below this (matches customWorkoutBuilder). */
const MIN_HOLD_SECONDS = 5;

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
  /** When the last card was finished; the summary measures up to here. */
  workoutEndTime: number | null;
  /** Training time so far, in seconds: the session clock, which stops while
   * paused, during Joker challenges and while the app is closed. Saved every
   * few seconds and when the app goes to the background, so a resumed
   * workout continues the clock from here. */
  elapsedSeconds: number;
  /** When elapsedSeconds was last saved; also drives the stale cutoff. */
  lastActivityAt: number | null;
  /** Unique id for the workout in progress, created when it starts. Saved
   * history rows use it, so saving the same workout twice is a no-op. */
  workoutId: string | null;
  /** workoutId of the last workout saved to history from this device. */
  savedWorkoutId: string | null;
  /** workoutId of the last workout whose streak/achievements were recorded. */
  recordedWorkoutId: string | null;
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
  markWorkoutSaved: (workoutId: string) => void;
  /** Saves the session clock (see elapsedSeconds). */
  recordElapsed: (seconds: number) => void;
  markWorkoutRecorded: (workoutId: string) => void;
  setIsShuffling: (v: boolean) => void;
  setIsFlipping: (v: boolean) => void;
  setJokerActive: (v: boolean) => void;
  setJokerChallenge: (c: JokerChallenge | null) => void;
  setIsSummary: (v: boolean) => void;
  setGuestMode: (v: boolean) => void;
  setInfoPanelOpen: (v: boolean) => void;
  reset: () => void;
}

/** An unfinished workout older than this is discarded instead of resumed. */
const STALE_WORKOUT_MS = 6 * 60 * 60 * 1000;

const initialState: WorkoutState = {
  selectedDeck: null,
  selectedCategory: null,
  selectedDifficulty: null,
  selectedCardCount: null,
  shuffledDeck: [],
  deckIndex: -1,
  workoutStartTime: null,
  workoutEndTime: null,
  elapsedSeconds: 0,
  lastActivityAt: null,
  workoutId: null,
  savedWorkoutId: null,
  recordedWorkoutId: null,
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
          set({
            isSummary: true,
            workoutEndTime: get().workoutEndTime ?? Date.now(),
          });
          return;
        }
        const nextRaw = shuffledDeck[nextIndex];
        if (!nextRaw) return;

        // Resolve ACE (×2) / KING (÷2) from the previous card. A timed
        // exercise (Pike Hold 20s) stays timed: the modifier scales the
        // seconds (Ace → 40s), it doesn't turn the hold into reps.
        let resolvedReps = nextRaw.reps;
        let resolvedExercise = nextRaw.exerciseName;
        let resolvedEquipment = nextRaw.requiresEquipment;
        let resolvedHoldSeconds = nextRaw.holdSeconds;
        let resolvedEachLeg = nextRaw.eachLeg;
        let resolvedEachSide = nextRaw.eachSide;
        if ((nextRaw.isAce || nextRaw.isKing) && currentCard) {
          const prevHold = currentCard.card.holdSeconds;
          if (nextRaw.isAce) {
            resolvedReps = currentCard.reps * 2;
            resolvedHoldSeconds = prevHold ? prevHold * 2 : undefined;
          } else {
            resolvedReps = Math.max(1, Math.ceil(currentCard.reps / 2));
            resolvedHoldSeconds = prevHold
              ? Math.max(MIN_HOLD_SECONDS, Math.round(prevHold / 2))
              : undefined;
          }
          resolvedExercise = currentCard.card.exercise;
          resolvedEquipment = currentCard.card.requiresEquipment;
          resolvedEachLeg = currentCard.card.eachLeg;
          resolvedEachSide = currentCard.card.eachSide;
        }

        const nextCard: LocalSessionCard = {
          card: {
            id: nextRaw.id,
            rank: nextRaw.rank,
            suit: nextRaw.suit,
            exercise: resolvedExercise,
            videoUrl: nextRaw.videoUrl,
            eachLeg: resolvedEachLeg,
            eachSide: resolvedEachSide,
            holdSeconds: resolvedHoldSeconds,
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

      // Starting a workout (t set) gives it a fresh id.
      setWorkoutStartTime: (t) =>
        set(
          t === null
            ? { workoutStartTime: null, workoutEndTime: null }
            : {
                workoutStartTime: t,
                workoutEndTime: null,
                elapsedSeconds: 0,
                lastActivityAt: t,
                workoutId: crypto.randomUUID(),
              },
        ),
      recordElapsed: (seconds) =>
        set({
          elapsedSeconds: Math.max(get().elapsedSeconds, Math.floor(seconds)),
          lastActivityAt: Date.now(),
        }),
      markWorkoutSaved: (workoutId) => set({ savedWorkoutId: workoutId }),
      markWorkoutRecorded: (workoutId) =>
        set({ recordedWorkoutId: workoutId }),
      setIsShuffling: (v) => set({ isShuffling: v }),
      setIsFlipping: (v) => set({ isFlipping: v }),
      setJokerActive: (v) => set({ jokerActive: v }),
      setJokerChallenge: (c) => set({ jokerChallenge: c }),
      setIsSummary: (v) =>
        set(
          v
            ? { isSummary: true, workoutEndTime: get().workoutEndTime ?? Date.now() }
            : { isSummary: false },
        ),
      setGuestMode: (v) => set({ guestMode: v }),
      setInfoPanelOpen: (v) => set({ infoPanelOpen: v }),
      // savedWorkoutId survives a reset so a summary that renders again
      // after the reset still knows that workout was saved.
      reset: () =>
        set({
          ...initialState,
          guestMode: get().guestMode,
          savedWorkoutId: get().savedWorkoutId,
          recordedWorkoutId: get().recordedWorkoutId,
        }),
    }),
    {
      name: "mbw_workout_store",
      // A workout in progress survives a reload (on Android the system can
      // close the app in the background mid-workout). Transient UI flags
      // (shuffling/flipping/info panel) are not kept. A workout older than
      // STALE_WORKOUT_MS is dropped on load instead of resumed.
      partialize: (state) => ({
        guestMode: state.guestMode,
        selectedCategory: state.selectedCategory,
        selectedDifficulty: state.selectedDifficulty,
        selectedCardCount: state.selectedCardCount,
        excludedExercises: state.excludedExercises,
        workoutGender: state.workoutGender,
        shuffledDeck: state.shuffledDeck,
        deckIndex: state.deckIndex,
        workoutStartTime: state.workoutStartTime,
        workoutEndTime: state.workoutEndTime,
        elapsedSeconds: state.elapsedSeconds,
        lastActivityAt: state.lastActivityAt,
        workoutId: state.workoutId,
        savedWorkoutId: state.savedWorkoutId,
        recordedWorkoutId: state.recordedWorkoutId,
        currentCard: state.currentCard,
        previousCard: state.previousCard,
        cardHistory: state.cardHistory,
        jokerActive: state.jokerActive,
        jokerChallenge: state.jokerChallenge,
        isSummary: state.isSummary,
        totalCards: state.totalCards,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<WorkoutState>;
        const lastUsed = saved.lastActivityAt ?? saved.workoutStartTime;
        const stale =
          lastUsed != null && Date.now() - lastUsed > STALE_WORKOUT_MS;
        if (stale) {
          return {
            ...current,
            guestMode: saved.guestMode ?? current.guestMode,
            savedWorkoutId: saved.savedWorkoutId ?? null,
            recordedWorkoutId: saved.recordedWorkoutId ?? null,
          };
        }
        return { ...current, ...saved };
      },
    },
  ),
);
